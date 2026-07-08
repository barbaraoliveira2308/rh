import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../src/database/data-source';
import { rbacSeed } from '../src/database/seeds';
import { hash } from 'argon2';
import { Employee, EmployeeStatus } from '../src/users/entities/employee.entity';

describe('Absences (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let empToken: string;
  let absenceTypeId: string;
  let adminEmployeeId: string;
  let empEmployeeId: string;

  beforeAll(async () => {
    dataSource = new DataSource({
      ...dataSourceOptions,
      synchronize: true,
    });
    await dataSource.initialize();

    await rbacSeed(dataSource);

    const userRepo = dataSource.getRepository('User');
    const roleRepo = dataSource.getRepository('Role');
    const userRoleRepo = dataSource.getRepository('UserRole');
    const employeeRepo = dataSource.getRepository(Employee);
    const absenceTypeRepo = dataSource.getRepository('AbsenceType');
    const balanceRepo = dataSource.getRepository('LeaveBalance');

    const adminUser = await userRepo.findOneBy({ email: 'admin@hr-suite.local' });
    if (!adminUser) throw new Error('Admin user not seeded');

    const adminHash = await hash('Admin123!');
    await userRepo.update(adminUser.id, { passwordHash: adminHash });

    const adminEmployee = employeeRepo.create({
      id: adminUser.id,
      userId: adminUser.id,
      employeeNumber: 'ADM-001',
      firstName: 'Admin',
      lastName: 'System',
      email: 'admin@hr-suite.local',
      status: EmployeeStatus.ACTIVE,
      employmentStartDate: '2020-01-01',
    });
    await employeeRepo.save(adminEmployee);
    adminEmployeeId = adminEmployee.id;

    const empHash = await hash('Test123!');
    const empUser = userRepo.create({
      email: 'employee@test.com',
      username: 'employee',
      passwordHash: empHash,
      isActive: true,
      passwordChangedAt: new Date(),
    });
    const savedEmpUser = await userRepo.save(empUser);

    const employeeRole = await roleRepo.findOneBy({ name: 'employee' });
    if (!employeeRole) throw new Error('Employee role not seeded');

    await userRoleRepo.save(
      userRoleRepo.create({
        userId: savedEmpUser.id,
        roleId: employeeRole.id,
        assignedBy: adminUser.id,
      }),
    );

    const empEmployee = employeeRepo.create({
      id: savedEmpUser.id,
      userId: savedEmpUser.id,
      employeeNumber: 'EMP-001',
      firstName: 'Regular',
      lastName: 'Employee',
      email: 'employee@test.com',
      status: EmployeeStatus.ACTIVE,
      managerId: adminEmployeeId,
      employmentStartDate: '2020-06-01',
    });
    await employeeRepo.save(empEmployee);
    empEmployeeId = empEmployee.id;

    const vacationType = absenceTypeRepo.create({
      name: 'Férias',
      code: 'VACATION',
      unit: 'days',
      limitPerYear: 22,
      requiresDocument: false,
      isPaid: true,
      affectsBalance: true,
      color: '#00FF00',
      isSystem: false,
      isActive: true,
    });
    await absenceTypeRepo.save(vacationType);
    absenceTypeId = vacationType.id;

    const adminBalance = balanceRepo.create({
      employeeId: adminEmployeeId,
      absenceTypeId,
      year: 2026,
      entitledDays: 22,
      usedDays: 0,
      pendingDays: 0,
      remainingDays: 22,
      carryOverDays: 0,
    });
    await balanceRepo.save(adminBalance);

    const empBalance = balanceRepo.create({
      employeeId: empEmployeeId,
      absenceTypeId,
      year: 2026,
      entitledDays: 22,
      usedDays: 0,
      pendingDays: 0,
      remainingDays: 22,
      carryOverDays: 0,
    });
    await balanceRepo.save(empBalance);

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

    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@hr-suite.local', password: 'Admin123!' })
      .expect(200);

    adminToken = adminLoginRes.body.accessToken;

    const empLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'employee@test.com', password: 'Test123!' })
      .expect(200);

    empToken = empLoginRes.body.accessToken;
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  describe('POST /api/absences', () => {
    const validPayload = {
      absenceTypeId,
      startDate: '2026-08-10',
      endDate: '2026-08-12',
      reason: 'Férias planeadas',
    };

    it('should create an absence as employee', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/absences')
        .set('Authorization', 'Bearer ' + empToken)
        .send(validPayload)
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.status).toBe('pending');
      expect(res.body.employeeId).toBe(empEmployeeId);
      expect(res.body.totalDays).toBe(3);
      expect(res.body.reason).toBe('Férias planeadas');
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).post('/api/absences').send(validPayload).expect(401);
    });

    it('should return 400 for invalid date range', async () => {
      await request(app.getHttpServer())
        .post('/api/absences')
        .set('Authorization', 'Bearer ' + empToken)
        .send({
          ...validPayload,
          startDate: '2026-08-12',
          endDate: '2026-08-10',
        })
        .expect(400);
    });
  });

  describe('POST /api/absences/:id/approve', () => {
    let absenceId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/absences')
        .set('Authorization', 'Bearer ' + empToken)
        .send({
          absenceTypeId,
          startDate: '2026-09-01',
          endDate: '2026-09-03',
          reason: 'Ausência para aprovar',
        })
        .expect(201);

      absenceId = res.body.id;
    });

    it('should approve absence as manager', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/absences/' + absenceId + '/approve')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({})
        .expect(200);

      expect(res.body.status).toBe('approved');
    });

    it('should return 400 for already approved absence', async () => {
      await request(app.getHttpServer())
        .post('/api/absences/' + absenceId + '/approve')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({})
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/absences/' + absenceId + '/approve')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({})
        .expect(400);
    });

    it('should return 403 for non-manager approver', async () => {
      await request(app.getHttpServer())
        .post('/api/absences/' + absenceId + '/approve')
        .set('Authorization', 'Bearer ' + empToken)
        .send({})
        .expect(403);
    });
  });

  describe('POST /api/absences/:id/reject', () => {
    let absenceId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/absences')
        .set('Authorization', 'Bearer ' + empToken)
        .send({
          absenceTypeId,
          startDate: '2026-09-07',
          endDate: '2026-09-08',
          reason: 'Ausência para rejeitar',
        })
        .expect(201);

      absenceId = res.body.id;
    });

    it('should reject absence as manager', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/absences/' + absenceId + '/reject')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({ reason: 'Não autorizado' })
        .expect(200);

      expect(res.body.status).toBe('rejected');
      expect(res.body.rejectionReason).toBe('Não autorizado');
    });

    it('should return 400 for already rejected absence', async () => {
      await request(app.getHttpServer())
        .post('/api/absences/' + absenceId + '/reject')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({ reason: 'Não autorizado' })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/absences/' + absenceId + '/reject')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({ reason: 'Já rejeitado' })
        .expect(400);
    });

    it('should return 400 without rejection reason', async () => {
      await request(app.getHttpServer())
        .post('/api/absences/' + absenceId + '/reject')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({})
        .expect(400);
    });
  });

  describe('POST /api/absences/:id/cancel', () => {
    let absenceId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/absences')
        .set('Authorization', 'Bearer ' + empToken)
        .send({
          absenceTypeId,
          startDate: '2026-10-01',
          endDate: '2026-10-02',
          reason: 'Ausência para cancelar',
        })
        .expect(201);

      absenceId = res.body.id;
    });

    it('should cancel own pending absence', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/absences/' + absenceId + '/cancel')
        .set('Authorization', 'Bearer ' + empToken)
        .expect(200);

      expect(res.body.status).toBe('cancelled');
    });

    it('should return 403 when cancelling another employee absence', async () => {
      await request(app.getHttpServer())
        .post('/api/absences/' + absenceId + '/cancel')
        .set('Authorization', 'Bearer ' + adminToken)
        .expect(403);
    });
  });

  describe('GET /api/absences', () => {
    it('should list absences for employee', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/absences')
        .set('Authorization', 'Bearer ' + empToken)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/api/absences').expect(401);
    });
  });

  describe('GET /api/absences/balance/:employeeId', () => {
    it('should return balance for own employee', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/absences/balance/' + empEmployeeId)
        .set('Authorization', 'Bearer ' + empToken)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].remainingDays).toBe(22);
    });
  });

  describe('GET /api/absences/:id', () => {
    let absenceId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/absences')
        .set('Authorization', 'Bearer ' + empToken)
        .send({
          absenceTypeId,
          startDate: '2026-10-05',
          endDate: '2026-10-05',
          reason: 'Ausência individual',
        })
        .expect(201);

      absenceId = res.body.id;
    });

    it('should return absence by id for owner', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/absences/' + absenceId)
        .set('Authorization', 'Bearer ' + empToken)
        .expect(200);

      expect(res.body.id).toBe(absenceId);
      expect(res.body.status).toBe('pending');
    });
  });
});
