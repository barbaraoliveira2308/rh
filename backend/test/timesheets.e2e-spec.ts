import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../src/database/data-source';
import { rbacSeed } from '../src/database/seeds';
import { hash } from 'argon2';
import { Employee, EmployeeStatus } from '../src/users/entities/employee.entity';
import { TimesheetsService } from '../src/timesheets/services/timesheets.service';
import { TimesheetPeriod } from '../src/timesheets/entities/timesheet-period.entity';
import { TimesheetStatus } from '../src/timesheets/entities/timesheet-status.enum';

process.env.MFA_ENCRYPTION_KEY = 'change_me_mfa_key_32_bytes';

describe('Timesheets (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let timesheetsService: TimesheetsService;
  let adminToken: string;
  let empToken: string;
  let adminEmployeeId: string;
  let empEmployeeId: string;
  let periodIdMonth7: string;
  let adminPeriodIdMonth7: string;

  beforeAll(async () => {
    dataSource = new DataSource({
      ...dataSourceOptions,
      synchronize: true,
      dropSchema: true,
    });
    await dataSource.initialize();

    await rbacSeed(dataSource);

    const userRepo = dataSource.getRepository('User');
    const roleRepo = dataSource.getRepository('Role');
    const userRoleRepo = dataSource.getRepository('UserRole');
    const employeeRepo = dataSource.getRepository(Employee);
    const periodRepo = dataSource.getRepository(TimesheetPeriod);

    const adminUser = await userRepo.findOneBy({ email: 'admin@hr-suite.local' });
    if (!adminUser) throw new Error('Admin user not seeded');

    await userRepo.update(adminUser.id, { passwordHash: await hash('Admin123!') });

    const adminEmployee = employeeRepo.create({
      id: adminUser.id,
      userId: adminUser.id,
      employeeNumber: 'ADM-001',
      firstName: 'Admin',
      lastName: 'System',
      email: 'admin@hr-suite.local',
      status: EmployeeStatus.ACTIVE,
      employmentStartDate: '2020-01-01',
      managerId: adminUser.id,
    });
    await employeeRepo.save(adminEmployee);
    adminEmployeeId = adminEmployee.id;

    const empUser = userRepo.create({
      email: 'employee@test.com',
      username: 'employee',
      passwordHash: await hash('Test123!'),
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

    timesheetsService = app.get(TimesheetsService);
    await timesheetsService.generateMonthlyPeriods(2026, 7);

    const empPeriod = await periodRepo.findOneBy({
      employeeId: empEmployeeId,
      periodYear: 2026,
      periodMonth: 7,
    });
    if (!empPeriod) throw new Error('Employee timesheet period not generated');
    periodIdMonth7 = empPeriod.id;

    const adminPeriod = await periodRepo.findOneBy({
      employeeId: adminEmployeeId,
      periodYear: 2026,
      periodMonth: 7,
    });
    if (!adminPeriod) throw new Error('Admin timesheet period not generated');
    adminPeriodIdMonth7 = adminPeriod.id;

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
    if (app) {
      await app.close();
    }
  });

  describe('GET /api/timesheets', () => {
    it('should list timesheets for employee', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/timesheets')
        .set('Authorization', 'Bearer ' + empToken)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/api/timesheets').expect(401);
    });
  });

  describe('GET /api/timesheets/:id', () => {
    it('should return own timesheet', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/timesheets/' + periodIdMonth7)
        .set('Authorization', 'Bearer ' + empToken)
        .expect(200);

      expect(res.body.id).toBe(periodIdMonth7);
      expect(res.body.employeeId).toBe(empEmployeeId);
    });

    it('should return 403 when accessing another employee timesheet', async () => {
      await request(app.getHttpServer())
        .get('/api/timesheets/' + adminPeriodIdMonth7)
        .set('Authorization', 'Bearer ' + empToken)
        .expect(403);
    });
  });

  describe('PATCH /api/timesheets/:id/entries/:entryId', () => {
    it('should update worked hours as owner', async () => {
      const periodRes = await request(app.getHttpServer())
        .get('/api/timesheets/' + periodIdMonth7)
        .set('Authorization', 'Bearer ' + empToken)
        .expect(200);

      const workEntry = periodRes.body.entries.find(
        (e: { entryType: string }) => e.entryType === 'work',
      );
      if (!workEntry) throw new Error('No work entry found');

      const res = await request(app.getHttpServer())
        .patch('/api/timesheets/' + periodIdMonth7 + '/entries/' + workEntry.id)
        .set('Authorization', 'Bearer ' + empToken)
        .send({ workedHours: 6 })
        .expect(200);

      expect(res.body.workedHours).toBe(6);
      expect(res.body.overtimeHours).toBe(0);
    });
  });

  describe('POST /api/timesheets/:id/submit', () => {
    let submitPeriodId: string;

    beforeAll(async () => {
      await timesheetsService.generateMonthlyPeriods(2026, 8);
      const periodRepo = dataSource.getRepository(TimesheetPeriod);
      const period = await periodRepo.findOneBy({
        employeeId: empEmployeeId,
        periodYear: 2026,
        periodMonth: 8,
      });
      if (!period) throw new Error('Submit period not generated');
      submitPeriodId = period.id;
    });

    it('should submit own timesheet', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/timesheets/' + submitPeriodId + '/submit')
        .set('Authorization', 'Bearer ' + empToken)
        .expect(200);

      expect(res.body.status).toBe(TimesheetStatus.SUBMITTED);
    });
  });

  describe('POST /api/timesheets/:id/approve', () => {
    let approvePeriodId: string;

    beforeAll(async () => {
      await timesheetsService.generateMonthlyPeriods(2026, 9);
      const periodRepo = dataSource.getRepository(TimesheetPeriod);
      const period = await periodRepo.findOneBy({
        employeeId: empEmployeeId,
        periodYear: 2026,
        periodMonth: 9,
      });
      if (!period) throw new Error('Approve period not generated');
      await timesheetsService.submitForApproval(period.id, empEmployeeId);
      approvePeriodId = period.id;
    });

    it('should approve timesheet as manager/admin', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/timesheets/' + approvePeriodId + '/approve')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({ comment: 'Approved' })
        .expect(200);

      expect(res.body.status).toBe(TimesheetStatus.APPROVED);
    });
  });

  describe('POST /api/timesheets/:id/reject', () => {
    let rejectPeriodId: string;

    beforeAll(async () => {
      await timesheetsService.generateMonthlyPeriods(2026, 10);
      const periodRepo = dataSource.getRepository(TimesheetPeriod);
      const period = await periodRepo.findOneBy({
        employeeId: empEmployeeId,
        periodYear: 2026,
        periodMonth: 10,
      });
      if (!period) throw new Error('Reject period not generated');
      await timesheetsService.submitForApproval(period.id, empEmployeeId);
      rejectPeriodId = period.id;
    });

    it('should reject timesheet as manager/admin', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/timesheets/' + rejectPeriodId + '/reject')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({ reason: 'Incomplete' })
        .expect(200);

      expect(res.body.status).toBe(TimesheetStatus.REJECTED);
    });
  });

  describe('POST /api/timesheets/bulk-approve', () => {
    let bulkPeriodId: string;

    beforeAll(async () => {
      await timesheetsService.generateMonthlyPeriods(2026, 11);
      const periodRepo = dataSource.getRepository(TimesheetPeriod);
      const period = await periodRepo.findOneBy({
        employeeId: empEmployeeId,
        periodYear: 2026,
        periodMonth: 11,
      });
      if (!period) throw new Error('Bulk period not generated');
      await timesheetsService.submitForApproval(period.id, empEmployeeId);
      bulkPeriodId = period.id;
    });

    it('should bulk-approve submitted timesheets', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/timesheets/bulk-approve')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({ ids: [bulkPeriodId] })
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].status).toBe(TimesheetStatus.APPROVED);
    });
  });

  describe('GET /api/timesheets/export', () => {
    it('should export timesheets as csv', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/timesheets/export?month=2026-07&format=csv')
        .set('Authorization', 'Bearer ' + adminToken)
        .expect(200);

      expect(res.text).toContain('employee_id');
      expect(res.headers['content-type']).toContain('text/csv');
    });

    it('should return 400 for unsupported format', async () => {
      await request(app.getHttpServer())
        .get('/api/timesheets/export?month=2026-07&format=xlsx')
        .set('Authorization', 'Bearer ' + adminToken)
        .expect(400);
    });
  });
});
