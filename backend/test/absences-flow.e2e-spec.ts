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
import { RATE_LIMIT_KEY_PREFIX } from '../src/auth/rate-limit/rate-limit-store';
import { testRateLimitKeyPrefix } from './support/rate-limit';

process.env.MFA_ENCRYPTION_KEY = 'change_me_mfa_key_32_bytes';

describe('Absence Full Cycle (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let timesheetsService: TimesheetsService;
  let adminToken: string;
  let empToken: string;
  let adminEmployeeId: string;
  let empEmployeeId: string;
  let absenceTypeId: string;

  beforeAll(async () => {
    dataSource = new DataSource({
      ...dataSourceOptions,
      synchronize: true,
      dropSchema: true,
    });
    await dataSource.initialize();

    await rbacSeed(dataSource);
    await dataSource.getRepository('SystemSetting').save({ mfaRequiredForAdmin: false });

    const userRepo = dataSource.getRepository('User');
    const roleRepo = dataSource.getRepository('Role');
    const userRoleRepo = dataSource.getRepository('UserRole');
    const employeeRepo = dataSource.getRepository(Employee);
    const absenceTypeRepo = dataSource.getRepository('AbsenceType');
    const balanceRepo = dataSource.getRepository('LeaveBalance');

    const adminUser = await userRepo.findOneBy({ email: 'admin@hr-suite.local' });
    if (!adminUser) throw new Error('Admin user not seeded');

    const adminPassHash = await hash('Admin123!');
    await userRepo.update(adminUser.id, {
      passwordHash: adminPassHash,
      email: 'admin-abs@test.com',
    });

    const adminEmployee = employeeRepo.create({
      id: adminUser.id,
      userId: adminUser.id,
      employeeNumber: 'ADM-ABS-001',
      firstName: 'Admin',
      lastName: 'Absences',
      email: 'admin-abs@test.com',
      status: EmployeeStatus.ACTIVE,
      employmentStartDate: '2020-01-01',
    });
    await employeeRepo.save(adminEmployee);
    adminEmployeeId = adminEmployee.id;

    const empHash = await hash('Test123!');
    const empUser = userRepo.create({
      email: 'employee-abs@test.com',
      username: 'employee-abs',
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
      employeeNumber: 'EMP-ABS-001',
      firstName: 'Regular',
      lastName: 'Absences',
      email: 'employee-abs@test.com',
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

    const balance = balanceRepo.create({
      employeeId: empEmployeeId,
      absenceTypeId,
      year: 2026,
      entitledDays: 22,
      usedDays: 0,
      pendingDays: 0,
      remainingDays: 22,
      carryOverDays: 0,
    });
    await balanceRepo.save(balance);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DataSource)
      .useValue(dataSource)
      .overrideProvider(RATE_LIMIT_KEY_PREFIX)
      .useValue(testRateLimitKeyPrefix())
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
    await timesheetsService.generateMonthlyPeriods(2026, 4);

    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin-abs@test.com', password: 'Admin123!' })
      .expect(200);
    adminToken = adminLoginRes.body.accessToken;

    const empLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'employee-abs@test.com', password: 'Test123!' })
      .expect(200);
    empToken = empLoginRes.body.accessToken;
  });

  afterAll(async () => {
    await dataSource.destroy();
    if (app) {
      await app.close();
    }
  });

  it('should complete full absence cycle: submit, approve, check balance decremented, check timesheet synced', async () => {
    // 1. Employee submits absence request for 3 days in April 2026
    const createRes = await request(app.getHttpServer())
      .post('/api/absences')
      .set('Authorization', 'Bearer ' + empToken)
      .send({
        absenceTypeId,
        startDate: '2026-04-15',
        endDate: '2026-04-17',
        reason: 'Férias planeadas - flow test',
      })
      .expect(201);

    const absenceId = createRes.body.id;
    expect(absenceId).toBeDefined();
    expect(createRes.body.status).toBe('pending');
    expect(createRes.body.totalDays).toBe(3);

    // 2. Verify balance shows pending days
    const balanceBefore = await request(app.getHttpServer())
      .get('/api/absences/balance/' + empEmployeeId)
      .set('Authorization', 'Bearer ' + empToken)
      .expect(200);

    const vacBalanceBefore = balanceBefore.body.find(
      (b: { absenceTypeId: string }) => b.absenceTypeId === absenceTypeId,
    );
    expect(vacBalanceBefore).toBeDefined();
    expect(Number(vacBalanceBefore.pendingDays)).toBe(3);
    expect(Number(vacBalanceBefore.remainingDays)).toBe(22);

    // 3. Manager approves
    const approveRes = await request(app.getHttpServer())
      .post('/api/absences/' + absenceId + '/approve')
      .set('Authorization', 'Bearer ' + adminToken)
      .send({})
      .expect(200);

    expect(approveRes.body.status).toBe('approved');

    // Absence-approved side effects (timesheet sync, notifications) run via a fire-and-forget
    // event handler — give it a moment to finish before asserting on its effects below.
    await new Promise((resolve) => setTimeout(resolve, 300));

    // 4. Verify balance decremented after approval
    const balanceAfter = await request(app.getHttpServer())
      .get('/api/absences/balance/' + empEmployeeId)
      .set('Authorization', 'Bearer ' + empToken)
      .expect(200);

    const vacBalanceAfter = balanceAfter.body.find(
      (b: { absenceTypeId: string }) => b.absenceTypeId === absenceTypeId,
    );
    expect(vacBalanceAfter).toBeDefined();
    expect(Number(vacBalanceAfter.usedDays)).toBe(3);
    expect(Number(vacBalanceAfter.pendingDays)).toBe(0);
    expect(Number(vacBalanceAfter.remainingDays)).toBe(19);

    // 5. Verify absence appears in the April timesheet (synced)
    const periodRepo = dataSource.getRepository(TimesheetPeriod);
    const period = await periodRepo.findOne({
      where: { employeeId: empEmployeeId, periodYear: 2026, periodMonth: 4 },
      relations: ['entries'],
    });
    if (!period) throw new Error('Timesheet period not found');

    const absenceEntries = period.entries.filter(
      (e: { entryType: string }) => e.entryType === 'absence',
    );
    expect(absenceEntries.length).toBeGreaterThanOrEqual(3);

    const absenceDates = absenceEntries.map((e: { entryDate: string }) => e.entryDate);
    expect(absenceDates).toContain('2026-04-15');
    expect(absenceDates).toContain('2026-04-16');
    expect(absenceDates).toContain('2026-04-17');
  });
});
