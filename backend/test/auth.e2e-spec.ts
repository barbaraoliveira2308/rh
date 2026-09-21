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

      // Decisão P092-04: desativar com um código de recuperação (telemóvel perdido). O MFA é
      // obrigatório para este admin, pelo que a sessão corrente também termina (decisão P095-02)
      // e o login seguinte volta a exigir a configuração.
      const disableRes = await request(app.getHttpServer())
        .post('/api/auth/mfa/disable')
        .set('Authorization', `Bearer ${fullToken}`)
        .send({ code: newCodes[0] })
        .expect(200);
      expect(disableRes.body.sessionEnded).toBe(true);

      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${fullToken}`)
        .expect(401);
      const reloginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@hr-suite.local', password: 'Admin123!' })
        .expect(200);
      expect(reloginRes.body.mfaSetupRequired).toBe(true);

      const remaining = await dataSource.query<unknown[]>('SELECT id FROM hr.mfa_recovery_codes');
      expect(remaining).toHaveLength(0);
    });
  });

  describe('Login com MFA (UC-AUTH-001 passo 4 e fluxos 2a/4a)', () => {
    const totpFor = (secret: string, offsetSteps = 0): string =>
      new TOTP({
        secret: Secret.fromBase32(secret),
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
      }).generate({ timestamp: Date.now() + offsetSteps * 30_000 });

    const createUser = async (email: string): Promise<void> => {
      await dataSource.getRepository('User').save({
        email,
        username: email.split('@')[0],
        passwordHash: await hash('UserPass123!'),
      });
    };

    const login = (email: string, password = 'UserPass123!'): request.Test =>
      request(app.getHttpServer()).post('/api/auth/login').send({ email, password });

    // Configura o MFA pela API, como um utilizador faria em /settings/security.
    const enrolMfa = async (
      email: string,
    ): Promise<{ secret: string; recoveryCodes: string[] }> => {
      const loginRes = await login(email).expect(200);
      const token = loginRes.body.accessToken as string;
      const enableRes = await request(app.getHttpServer())
        .post('/api/auth/mfa/enable')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const secret = enableRes.body.secret as string;
      const verifyRes = await request(app.getHttpServer())
        .post('/api/auth/mfa/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: totpFor(secret, -1) })
        .expect(200);
      return { secret, recoveryCodes: verifyRes.body.recoveryCodes as string[] };
    };

    it('deve pedir o código em vez de emitir sessão, e concluir com TOTP ou código de recuperação', async () => {
      const email = 'mfa-login@hr-suite.local';
      await createUser(email);
      const { secret, recoveryCodes } = await enrolMfa(email);

      const challengeRes = await login(email).expect(200);
      expect(challengeRes.body).toEqual({
        mfaRequired: true,
        challengeToken: expect.any(String) as string,
      });
      const challengeToken = challengeRes.body.challengeToken as string;

      // 4a: código errado rejeitado, mas o desafio continua válido para uma nova tentativa.
      await request(app.getHttpServer())
        .post('/api/auth/login/mfa')
        .send({ challengeToken, code: '000000' === totpFor(secret) ? '111111' : '000000' })
        .expect(401);
      // O AuditService grava numa fila assíncrona (setImmediate); espera-se pela escrita.
      let failures: unknown[] = [];
      for (let i = 0; i < 20 && failures.length === 0; i++) {
        failures = await dataSource.query<unknown[]>(
          `SELECT id FROM hr.audit_logs WHERE action = 'LOGIN_MFA_FAILED'`,
        );
        if (failures.length === 0) await new Promise((resolve) => setTimeout(resolve, 50));
      }
      expect(failures.length).toBeGreaterThan(0);

      const okRes = await request(app.getHttpServer())
        .post('/api/auth/login/mfa')
        .send({ challengeToken, code: totpFor(secret) })
        .expect(200);
      expect(okRes.body.accessToken).toBeDefined();
      expect(okRes.body.user.email).toBe(email);
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${okRes.body.accessToken as string}`)
        .expect(200);

      // O desafio é de uso único.
      await request(app.getHttpServer())
        .post('/api/auth/login/mfa')
        .send({ challengeToken, code: totpFor(secret) })
        .expect(401);

      // Código de recuperação: funciona uma vez, a segunda é recusada.
      const second = (await login(email).expect(200)).body.challengeToken as string;
      await request(app.getHttpServer())
        .post('/api/auth/login/mfa')
        .send({ challengeToken: second, code: recoveryCodes[0].toLowerCase() })
        .expect(200);
      const third = (await login(email).expect(200)).body.challengeToken as string;
      await request(app.getHttpServer())
        .post('/api/auth/login/mfa')
        .send({ challengeToken: third, code: recoveryCodes[0] })
        .expect(401);
    });

    it('deve bloquear a conta com 403 depois de 5 códigos MFA errados (4a + BR-AUTH-002)', async () => {
      const email = 'mfa-lockout@hr-suite.local';
      await createUser(email);
      const { secret } = await enrolMfa(email);
      const wrong = '000000' === totpFor(secret) ? '111111' : '000000';

      const challengeToken = (await login(email).expect(200)).body.challengeToken as string;
      for (let attempt = 1; attempt <= 4; attempt++) {
        await request(app.getHttpServer())
          .post('/api/auth/login/mfa')
          .send({ challengeToken, code: wrong })
          .expect(401);
      }
      await request(app.getHttpServer())
        .post('/api/auth/login/mfa')
        .send({ challengeToken, code: wrong })
        .expect(403);

      // Bloqueada: nem a password certa abre um desafio novo.
      await login(email).expect(403);
    });

    it('deve devolver 403 logo na tentativa de password que bloqueia a conta (fluxo 2a)', async () => {
      const email = 'pw-lockout@hr-suite.local';
      await createUser(email);

      for (let attempt = 1; attempt <= 4; attempt++) {
        await login(email, 'Errada123!').expect(401);
      }
      await login(email, 'Errada123!').expect(403);
      await login(email).expect(403);
    });
  });

  describe('R-065 — reutilização de códigos TOTP e sessões ao mudar o MFA', () => {
    const totpFor = (secret: string, offsetSteps = 0): string =>
      new TOTP({
        secret: Secret.fromBase32(secret),
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
      }).generate({ timestamp: Date.now() + offsetSteps * 30_000 });

    const login = (email: string): request.Test =>
      request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'UserPass123!' });

    it('deve terminar as outras sessões ao ativar o MFA e recusar um código já usado', async () => {
      const email = 'r065@hr-suite.local';
      await dataSource.getRepository('User').save({
        email,
        username: 'r065',
        passwordHash: await hash('UserPass123!'),
      });

      // Duas sessões abertas antes do MFA: "este browser" e "outro dispositivo".
      const current = (await login(email).expect(200)).body.accessToken as string;
      const other = (await login(email).expect(200)).body.accessToken as string;

      const secret = (
        await request(app.getHttpServer())
          .post('/api/auth/mfa/enable')
          .set('Authorization', `Bearer ${current}`)
          .expect(200)
      ).body.secret as string;
      await request(app.getHttpServer())
        .post('/api/auth/mfa/verify')
        .set('Authorization', `Bearer ${current}`)
        .send({ code: totpFor(secret, -1) })
        .expect(200);

      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${other}`)
        .expect(401);
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${current}`)
        .expect(200);

      // O código da janela atual entra uma vez; o mesmo código num segundo login é recusado.
      const code = totpFor(secret);
      const first = (await login(email).expect(200)).body.challengeToken as string;
      await request(app.getHttpServer())
        .post('/api/auth/login/mfa')
        .send({ challengeToken: first, code })
        .expect(200);
      const second = (await login(email).expect(200)).body.challengeToken as string;
      await request(app.getHttpServer())
        .post('/api/auth/login/mfa')
        .send({ challengeToken: second, code })
        .expect(401);

      // O código da janela anterior também já não serve: o passo aceite só avança.
      await request(app.getHttpServer())
        .post('/api/auth/login/mfa')
        .send({ challengeToken: second, code: totpFor(secret, -1) })
        .expect(401);
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
