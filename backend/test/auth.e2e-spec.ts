import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../src/database/data-source';
import { rbacSeed } from '../src/database/seeds';
import { hash } from 'argon2';

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
});
