import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { hash } from 'argon2';
import { AppModule } from '../src/app.module';
import { dataSourceOptions } from '../src/database/data-source';
import { rbacSeed } from '../src/database/seeds';
import { RATE_LIMIT_KEY_PREFIX } from '../src/auth/rate-limit/rate-limit-store';
import { SessionsService, SESSION_RETENTION_DAYS } from '../src/auth/services/sessions.service';
import { JwtService } from '../src/auth/services/jwt.service';
import { deleteRateLimitKeys, testRateLimitKeyPrefix } from './support/rate-limit';

process.env.MFA_ENCRYPTION_KEY = 'change_me_mfa_key_32_bytes';

// R-061 (P-107): sessões em hr.sessions e contadores do rate limit no Redis sobrevivem a um
// reinício e são partilhados por várias instâncias. Cada "instância" é uma app Nest com a sua
// própria ligação à BD, como teria um segundo processo; o Redis e o prefixo das chaves são os
// mesmos para todas.
describe('Sessões e rate limit fora da memória do processo (e2e)', () => {
  const email = 'sessions@hr-suite.local';
  const password = 'UserPass123!';
  const rateLimitKeyPrefix = testRateLimitKeyPrefix();
  const running: Array<{ app: INestApplication; dataSource: DataSource }> = [];
  let setupDataSource: DataSource;

  const startInstance = async (): Promise<INestApplication> => {
    const dataSource = new DataSource(dataSourceOptions);
    await dataSource.initialize();

    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DataSource)
      .useValue(dataSource)
      .overrideProvider(RATE_LIMIT_KEY_PREFIX)
      .useValue(rateLimitKeyPrefix)
      .compile();

    const app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    running.push({ app, dataSource });
    return app;
  };

  const stopInstance = async (app: INestApplication): Promise<void> => {
    const index = running.findIndex((entry) => entry.app === app);
    const [{ dataSource }] = running.splice(index, 1);
    await app.close();
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  };

  const login = async (
    app: INestApplication,
  ): Promise<{ accessToken: string; refreshToken: string }> => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);
    return res.body as { accessToken: string; refreshToken: string };
  };

  const me = (app: INestApplication, accessToken: string): request.Test =>
    request(app.getHttpServer()).get('/api/auth/me').set('Authorization', `Bearer ${accessToken}`);

  beforeAll(async () => {
    setupDataSource = new DataSource({ ...dataSourceOptions, synchronize: true, dropSchema: true });
    await setupDataSource.initialize();
    await rbacSeed(setupDataSource);
    await setupDataSource.getRepository('SystemSetting').save({});
    await setupDataSource.getRepository('User').save({
      email,
      username: 'sessions',
      passwordHash: await hash(password),
    });
  });

  beforeEach(async () => {
    await deleteRateLimitKeys(rateLimitKeyPrefix);
  });

  afterEach(async () => {
    for (const { app } of [...running]) {
      await stopInstance(app);
    }
  });

  afterAll(async () => {
    await deleteRateLimitKeys(rateLimitKeyPrefix);
    await setupDataSource.destroy();
  });

  it('deve manter a sessão depois de reiniciar o backend', async () => {
    const before = await startInstance();
    const tokens = await login(before);
    await me(before, tokens.accessToken).expect(200);
    await stopInstance(before);

    const after = await startInstance();
    await me(after, tokens.accessToken).expect(200);
    await request(after.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: tokens.refreshToken })
      .expect(200);
  });

  it('deve partilhar sessões entre duas instâncias, incluindo o logout', async () => {
    const a = await startInstance();
    const b = await startInstance();

    const tokens = await login(a);
    await me(b, tokens.accessToken).expect(200);

    await request(b.getHttpServer())
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .expect(200);
    await me(a, tokens.accessToken).expect(401);
  });

  it('deve partilhar o limite de 10 pedidos/minuto do login entre duas instâncias', async () => {
    const a = await startInstance();
    const b = await startInstance();
    // Email inexistente: 401 em todas as tentativas, sem bloquear nenhuma conta.
    const attempt = (app: INestApplication): request.Test =>
      request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'ninguem@hr-suite.local', password: 'Errada123!' });

    for (let i = 0; i < 5; i++) {
      await attempt(a).expect(401);
      await attempt(b).expect(401);
    }

    const res = await attempt(b).expect(429);
    expect(res.body.message).toBe('Demasiados pedidos. Tente novamente mais tarde.');
    await attempt(a).expect(429);

    // O health check só informa o armazenamento; nunca falha por causa dele.
    const health = await request(a.getHttpServer()).get('/api/health').expect(200);
    expect(health.body.rateLimitStore).toBe('redis');
  });

  it('deve recusar com a resposta de hoje uma sessão revogada ou expirada', async () => {
    const app = await startInstance();
    const revoked = await login(app);
    const expired = await login(app);

    await setupDataSource.query(`UPDATE hr.sessions SET revoked_at = now() WHERE token_hash = $1`, [
      app.get(JwtService).computeTokenHash(revoked.accessToken),
    ]);
    await setupDataSource.query(
      `UPDATE hr.sessions SET expires_at = now() - interval '1 minute' WHERE token_hash = $1`,
      [app.get(JwtService).computeTokenHash(expired.accessToken)],
    );

    for (const token of [revoked.accessToken, expired.accessToken]) {
      const res = await me(app, token).expect(401);
      expect(res.body.message).toBe('Sessão inválida ou expirada');
    }
  });

  it('deve apagar só as sessões terminadas há mais do que a retenção, sem afetar as ativas', async () => {
    const app = await startInstance();
    const active = await login(app);
    const [{ id: userId }] = await setupDataSource.query<Array<{ id: string }>>(
      'SELECT id FROM hr.users WHERE email = $1',
      [email],
    );

    // Um dia de margem para cada lado do corte de SESSION_RETENTION_DAYS (30 dias).
    const rows: Array<[string, string, string, string | null, string]> = [
      ['expired-old', 'deleted', `now() - interval '31 days'`, null, 'now()'],
      ['expired-recent', 'kept', `now() - interval '29 days'`, null, 'now()'],
      ['revoked-old', 'deleted', `now() + interval '1 day'`, `now() - interval '31 days'`, 'now()'],
      ['revoked-recent', 'kept', `now() + interval '1 day'`, `now() - interval '29 days'`, 'now()'],
      ['idle-old', 'deleted', `now() + interval '1 day'`, null, `now() - interval '31 days'`],
      ['idle-recent', 'kept', `now() + interval '1 day'`, null, `now() - interval '29 days'`],
    ];
    for (const [tokenHash, , expiresAt, revokedAt, lastActivityAt] of rows) {
      await setupDataSource.query(
        `INSERT INTO hr.sessions (user_id, token_hash, ip_address, expires_at, revoked_at, last_activity_at)
         VALUES ($1, $2, '127.0.0.1', ${expiresAt}, ${revokedAt ?? 'NULL'}, ${lastActivityAt})`,
        [userId, tokenHash],
      );
    }

    const deleted = await app.get(SessionsService).deleteEnded(SESSION_RETENTION_DAYS);

    expect(deleted).toBe(3);
    const remaining = await setupDataSource.query<Array<{ token_hash: string }>>(
      'SELECT token_hash FROM hr.sessions',
    );
    const remainingHashes = remaining.map((row) => row.token_hash);
    for (const [tokenHash, outcome] of rows) {
      expect(remainingHashes.includes(tokenHash)).toBe(outcome === 'kept');
    }
    await me(app, active.accessToken).expect(200);
  });
});
