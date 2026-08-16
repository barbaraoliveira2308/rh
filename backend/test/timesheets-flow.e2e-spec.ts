import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../src/database/data-source';
import { rbacSeed } from '../src/database/seeds';
import { hash } from 'argon2';
import { Employee, EmployeeStatus } from '../src/users/entities/employee.entity';
import { Client, ClientStatus } from '../src/clients/entities/client.entity';
import { ProjectStatus } from '../src/projects/entities/project.entity';
import { AllocationType } from '../src/projects/entities/project-allocation.entity';
import { TimesheetsService } from '../src/timesheets/services/timesheets.service';
import { TimesheetPeriod } from '../src/timesheets/entities/timesheet-period.entity';
import { TimesheetStatus } from '../src/timesheets/entities/timesheet-status.enum';
import { Notification } from '../src/notifications/entities/notification.entity';

process.env.MFA_ENCRYPTION_KEY = 'change_me_mfa_key_32_bytes';

describe('Timesheet Full Cycle (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let timesheetsService: TimesheetsService;
  let adminToken: string;
  let empToken: string;
  let adminEmployeeId: string;
  let empEmployeeId: string;
  let projectId: string;
  let periodId: string;
  let clientId: string;

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
    const clientRepo = dataSource.getRepository(Client);

    const adminUser = await userRepo.findOneBy({ email: 'admin@hr-suite.local' });
    if (!adminUser) throw new Error('Admin user not seeded');

    const adminPassHash = await hash('Admin123!');
    await userRepo.update(adminUser.id, {
      passwordHash: adminPassHash,
      email: 'admin-flow@test.com',
    });

    const adminEmployee = employeeRepo.create({
      id: adminUser.id,
      userId: adminUser.id,
      employeeNumber: 'ADM-FLW-001',
      firstName: 'Admin',
      lastName: 'Flow',
      email: 'admin-flow@test.com',
      status: EmployeeStatus.ACTIVE,
      employmentStartDate: '2020-01-01',
    });
    await employeeRepo.save(adminEmployee);
    adminEmployeeId = adminEmployee.id;

    const empPassHash = await hash('Test123!');
    const empUser = userRepo.create({
      email: 'employee-flow@test.com',
      username: 'employee-flow',
      passwordHash: empPassHash,
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
      employeeNumber: 'EMP-FLW-001',
      firstName: 'Regular',
      lastName: 'Flow',
      email: 'employee-flow@test.com',
      status: EmployeeStatus.ACTIVE,
      managerId: adminEmployeeId,
      employmentStartDate: '2020-06-01',
    });
    await employeeRepo.save(empEmployee);
    empEmployeeId = empEmployee.id;

    const client = clientRepo.create({
      name: 'Flow Test Client',
      nif: '987654321',
      status: ClientStatus.ACTIVE,
      responsibleId: adminEmployeeId,
    });
    const savedClient = await clientRepo.save(client);
    clientId = savedClient.id;

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

    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin-flow@test.com', password: 'Admin123!' })
      .expect(200);
    adminToken = adminLoginRes.body.accessToken;

    const empLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'employee-flow@test.com', password: 'Test123!' })
      .expect(200);
    empToken = empLoginRes.body.accessToken;
  });

  afterAll(async () => {
    await dataSource.destroy();
    if (app) {
      await app.close();
    }
  });

  it('should complete full timesheet cycle: create project, allocate, fill, submit, approve, check notification', async () => {
    // 1. Create project
    const projectRes = await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', 'Bearer ' + adminToken)
      .send({
        name: 'Flow Test Project',
        clientId,
        managerId: adminEmployeeId,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        description: 'Project for e2e flow test',
        hourlyRate: 60,
        budget: 120000,
      })
      .expect(201);

    projectId = projectRes.body.id;
    expect(projectId).toBeDefined();
    expect(projectRes.body.status).toBe(ProjectStatus.DRAFT);

    // 2. Allocate employee
    const allocRes = await request(app.getHttpServer())
      .post('/api/projects/' + projectId + '/allocations')
      .set('Authorization', 'Bearer ' + adminToken)
      .send({
        employeeId: empEmployeeId,
        allocationType: AllocationType.PERCENTAGE,
        allocationValue: 100,
        startDate: '2026-03-01',
        endDate: '2026-03-31',
        roleInProject: 'Developer',
      })
      .expect(201);

    expect(allocRes.body.allocation).toBeDefined();

    // 3. Activate project
    await request(app.getHttpServer())
      .post('/api/projects/' + projectId + '/activate')
      .set('Authorization', 'Bearer ' + adminToken)
      .expect(200);

    // 4. Generate timesheet for March 2026
    await timesheetsService.generateMonthlyPeriods(2026, 3);

    const periodRepo = dataSource.getRepository(TimesheetPeriod);
    const period = await periodRepo.findOneBy({
      employeeId: empEmployeeId,
      periodYear: 2026,
      periodMonth: 3,
    });
    if (!period) throw new Error('Timesheet period not generated');
    periodId = period.id;

    // 5. Employee fills an entry (update worked hours)
    const periodRes = await request(app.getHttpServer())
      .get('/api/timesheets/' + periodId)
      .set('Authorization', 'Bearer ' + empToken)
      .expect(200);

    const workEntry = periodRes.body.entries.find(
      (e: { entryType: string }) => e.entryType === 'work',
    );
    if (!workEntry) throw new Error('No work entry found');

    await request(app.getHttpServer())
      .patch('/api/timesheets/' + periodId + '/entries/' + workEntry.id)
      .set('Authorization', 'Bearer ' + empToken)
      .send({ workedHours: 8 })
      .expect(200);

    // 6. Employee submits timesheet
    const submitRes = await request(app.getHttpServer())
      .post('/api/timesheets/' + periodId + '/submit')
      .set('Authorization', 'Bearer ' + empToken)
      .expect(200);

    expect(submitRes.body.status).toBe(TimesheetStatus.SUBMITTED);

    // 7. Manager approves timesheet
    const approveRes = await request(app.getHttpServer())
      .post('/api/timesheets/' + periodId + '/approve')
      .set('Authorization', 'Bearer ' + adminToken)
      .send({ comment: 'Approved via flow test' })
      .expect(200);

    expect(approveRes.body.status).toBe(TimesheetStatus.APPROVED);

    // Timesheet-approved notifications run via a fire-and-forget event handler — give it a
    // moment to finish before asserting on its effects below.
    await new Promise((resolve) => setTimeout(resolve, 300));

    // 8. Check notification was created for the employee
    const notifRepo = dataSource.getRepository(Notification);
    const notifications = await notifRepo.find({
      where: { recipientId: empEmployeeId },
    });

    expect(notifications.length).toBeGreaterThan(0);
    const timesheetNotif = notifications.find((n) => n.type === 'timesheet.approved');
    expect(timesheetNotif).toBeDefined();
    if (timesheetNotif) {
      expect(timesheetNotif.status).toBe('sent');
      expect(timesheetNotif.referenceId).toBe(periodId);
    }
  });
});
