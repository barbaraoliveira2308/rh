import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../src/database/data-source';
import { rbacSeed } from '../src/database/seeds';
import { hash } from 'argon2';
import { TOTP, Secret } from 'otpauth';
import { NotificationsService } from '../src/notifications/services/notifications.service';
import { RateLimitGuard } from '../src/auth/guards/rate-limit.guard';

process.env.MFA_ENCRYPTION_KEY = 'change_me_mfa_key_32_bytes';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = new DataSource({
      ...dataSourceOptions,
      synchronize: true,
      dropSchema: true,
    });
    await dataSource.initialize();

    await rbacSeed(dataSource);
    await dataSource.getRepository('SystemSetting').save({});

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DataSource)
      .useValue(dataSource)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  // O RateLimitGuard conta 10 pedidos/minuto por IP e todos os pedidos da suite vêm do mesmo IP;
  // sem isto, cada teste que acrescenta um login desloca a falha para o fim da suite.
  beforeEach(() => {
    (app.get(RateLimitGuard) as unknown as { store: Map<string, unknown> }).store.clear();
  });

  afterAll(async () => {
    await dataSource.destroy();
    if (app) {
      await app.close();
    }
  });

  describe('POST /api/auth/login', () => {
    it('should return 401 for invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'wrong' })
        .expect(401);
    });

    it('should login with seeded admin user', async () => {
      const userRepo = dataSource.getRepository('User');
      const adminPasswordHash = await hash('Admin123!');
      await userRepo.update({ email: 'admin@hr-suite.local' }, { passwordHash: adminPasswordHash });

      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@hr-suite.local', password: 'Admin123!' })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('admin@hr-suite.local');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@hr-suite.local', password: 'Admin123!' })
        .expect(200);

      const refreshToken = loginRes.body.refreshToken;

      const refreshRes = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(refreshRes.body.accessToken).toBeDefined();
      expect(refreshRes.body.refreshToken).toBeDefined();
      expect(refreshRes.body.accessToken).not.toBe(loginRes.body.accessToken);
      expect(refreshRes.body.refreshToken).not.toBe(refreshToken);
    });

    it('should return 401 for invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@hr-suite.local', password: 'Admin123!' })
        .expect(200);

      const accessToken = loginRes.body.accessToken;

      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should return 401 without token', () => {
      return request(app.getHttpServer()).post('/api/auth/logout').expect(401);
    });

    it('deve invalidar access token e refresh token após logout (UC-AUTH-004 passos 2 e 3)', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@hr-suite.local', password: 'Admin123!' })
        .expect(200);

      const accessToken = loginRes.body.accessToken;
      const refreshToken = loginRes.body.refreshToken;

      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);

      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return profile when authenticated', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@hr-suite.local', password: 'Admin123!' })
        .expect(200);

      const accessToken = loginRes.body.accessToken;

      const meRes = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(meRes.body.email).toBe('admin@hr-suite.local');
      expect(meRes.body.roles).toContain('admin');
    });

    it('should return 401 without token', () => {
      return request(app.getHttpServer()).get('/api/auth/me').expect(401);
    });
  });

  describe('MFA obrigatório para Admin (mfaRequiredForAdmin)', () => {
    it('deve devolver um token de âmbito limitado que permite /auth/me mas bloqueia outras rotas protegidas', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@hr-suite.local', password: 'Admin123!' })
        .expect(200);

      const accessToken = loginRes.body.accessToken;

      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/auth/password/change')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ oldPassword: 'Admin123!', newPassword: 'NewPass123!' })
        .expect(403);
    });
  });

  describe('Configurar MFA (UC-AUTH-005)', () => {
    // Código TOTP de um passo de tempo inteiro à frente/atrás, para não colidir com o anterior
    // quando dois códigos são pedidos no mesmo intervalo de 30 s.
    const totpFor = (secret: string, offsetSteps = 0): string =>
      new TOTP({
        secret: Secret.fromBase32(secret),
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
      }).generate({ timestamp: Date.now() + offsetSteps * 30_000 });

    it('deve completar o fluxo de ponta a ponta: segredo, confirmação, códigos de recuperação e desativação', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@hr-suite.local', password: 'Admin123!' })
        .expect(200);
      expect(loginRes.body.mfaSetupRequired).toBe(true);
      const restrictedToken = loginRes.body.accessToken as string;

      // Passo 2: segredo + QR code, acessível com o token de âmbito limitado.
      const enableRes = await request(app.getHttpServer())
        .post('/api/auth/mfa/enable')
        .set('Authorization', `Bearer ${restrictedToken}`)
        .expect(200);
      const secret = enableRes.body.secret as string;
      expect(enableRes.body.qrCodeUrl).toContain('admin%40hr-suite.local');
      expect(enableRes.body.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);

      // Passos 4 a 6: confirmação ativa o MFA e devolve 10 códigos de recuperação.
      const verifyRes = await request(app.getHttpServer())
        .post('/api/auth/mfa/verify')
        .set('Authorization', `Bearer ${restrictedToken}`)
        .send({ code: totpFor(secret) })
        .expect(200);
      const recoveryCodes = verifyRes.body.recoveryCodes as string[];
      expect(recoveryCodes).toHaveLength(10);

      const stored = await dataSource.query<Array<{ code_hash: string }>>(
        'SELECT code_hash FROM hr.mfa_recovery_codes',
      );
      expect(stored).toHaveLength(10);
      expect(stored.map((row) => row.code_hash)).not.toContain(recoveryCodes[0]);

      // Depois do refresh, o token deixa de ter âmbito limitado.
      const refreshRes = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: loginRes.body.refreshToken })
        .expect(200);
      const fullToken = refreshRes.body.accessToken as string;
      await request(app.getHttpServer())
        .get('/api/admin/settings')
        .set('Authorization', `Bearer ${fullToken}`)
        .expect(200);

      // Decisão P092-03: com MFA ativo, /mfa/enable não pode substituir o segredo.
      await request(app.getHttpServer())
        .post('/api/auth/mfa/enable')
        .set('Authorization', `Bearer ${fullToken}`)
        .expect(400);

      const regenRes = await request(app.getHttpServer())
        .post('/api/auth/mfa/recovery-codes')
        .set('Authorization', `Bearer ${fullToken}`)
        .send({ code: totpFor(secret, 1) })
        .expect(200);
      const newCodes = regenRes.body.recoveryCodes as string[];
      expect(newCodes).toHaveLength(10);

      // Os códigos antigos deixam de valer depois de regenerados.
      await request(app.getHttpServer())
        .post('/api/auth/mfa/disable')
        .set('Authorization', `Bearer ${fullToken}`)
        .send({ code: recoveryCodes[0] })
        .expect(400);

      // Decisão P092-04: desativar com um código de recuperação (telemóvel perdido).
      await request(app.getHttpServer())
        .post('/api/auth/mfa/disable')
        .set('Authorization', `Bearer ${fullToken}`)
        .send({ code: newCodes[0] })
        .expect(200);

      const profileRes = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${fullToken}`)
        .expect(200);
      expect(profileRes.body.mfaEnabled).toBe(false);

      const remaining = await dataSource.query<unknown[]>('SELECT id FROM hr.mfa_recovery_codes');
      expect(remaining).toHaveLength(0);
    });
  });

  describe('POST /api/auth/password/change', () => {
    it('should change password successfully', async () => {
      const settingsRepo = dataSource.getRepository('SystemSetting');
      const [settings] = (await settingsRepo.find({ take: 1 })) as Array<{ id: string }>;
      await settingsRepo.update(settings.id, { mfaRequiredForAdmin: false });

      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@hr-suite.local', password: 'Admin123!' })
        .expect(200);

      const accessToken = loginRes.body.accessToken;

      await request(app.getHttpServer())
        .post('/api/auth/password/change')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ oldPassword: 'Admin123!', newPassword: 'NewPass123!' })
        .expect(200);

      const userRepo = dataSource.getRepository('User');
      await userRepo.update(
        { email: 'admin@hr-suite.local' },
        { passwordHash: await hash('Admin123!') },
      );
    });
  });

  describe('Reset de password (UC-AUTH-003)', () => {
    it('deve responder 200 mesmo para email inexistente (fluxo alternativo 2a)', () => {
      return request(app.getHttpServer())
        .post('/api/auth/password/reset-request')
        .send({ email: 'nao-existe@hr-suite.local' })
        .expect(200);
    });

    it('deve rejeitar um token de reset inválido', () => {
      return request(app.getHttpServer())
        .post('/api/auth/password/reset')
        .send({ token: 'token-que-nao-existe', newPassword: 'OutraPass123!' })
        .expect(400);
    });

    it('deve completar o fluxo de ponta a ponta: pedido, email, nova password, login', async () => {
      const notifications = app.get(NotificationsService);
      let resetUrl = '';
      const spy = jest
        .spyOn(notifications, 'sendEmail')
        .mockImplementation((_to: string, _code: string, variables: Record<string, unknown>) => {
          resetUrl = variables.resetUrl as string;
          return Promise.resolve();
        });

      try {
        await request(app.getHttpServer())
          .post('/api/auth/password/reset-request')
          .send({ email: 'admin@hr-suite.local' })
          .expect(200);

        expect(resetUrl).toContain('/auth/reset-password/confirm?token=');
        const token = new URL(resetUrl).searchParams.get('token');
        expect(token).toBeTruthy();

        await request(app.getHttpServer())
          .post('/api/auth/password/reset')
          .send({ token, newPassword: 'ResetPass123!' })
          .expect(200);

        // O token é de uso único.
        await request(app.getHttpServer())
          .post('/api/auth/password/reset')
          .send({ token, newPassword: 'OutraPass456!' })
          .expect(400);

        await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({ email: 'admin@hr-suite.local', password: 'Admin123!' })
          .expect(401);

        await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({ email: 'admin@hr-suite.local', password: 'ResetPass123!' })
          .expect(200);
      } finally {
        spy.mockRestore();
        const userRepo = dataSource.getRepository('User');
        await userRepo.update(
          { email: 'admin@hr-suite.local' },
          { passwordHash: await hash('Admin123!') },
        );
      }
    });
  });
});
