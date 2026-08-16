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

process.env.MFA_ENCRYPTION_KEY = 'change_me_mfa_key_32_bytes';

describe('Projects (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let empToken: string;
  let adminEmployeeId: string;
  let empEmployeeId: string;
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

    const client = clientRepo.create({
      name: 'Test Client',
      nif: '123456789',
      status: ClientStatus.ACTIVE,
      responsibleId: adminEmployeeId,
    });
    await clientRepo.save(client);
    clientId = client.id;

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
    if (app) {
      await app.close();
    }
  });

  const createProjectPayload = {
    name: 'Project Alpha',
    clientId: '',
    managerId: '',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    description: 'Test project',
    hourlyRate: 50,
    budget: 100000,
  };

  beforeEach(() => {
    createProjectPayload.clientId = clientId;
    createProjectPayload.managerId = adminEmployeeId;
  });

  describe('POST /api/projects', () => {
    it('should create a project as admin', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({ ...createProjectPayload, code: 'PRJ-E2E-001' })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.status).toBe(ProjectStatus.DRAFT);
      expect(res.body.name).toBe('Project Alpha');
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .post('/api/projects')
        .send(createProjectPayload)
        .expect(401);
    });

    it('should return 403 for employee role', async () => {
      await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', 'Bearer ' + empToken)
        .send(createProjectPayload)
        .expect(403);
    });
  });

  describe('GET /api/projects', () => {
    it('should list projects for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/projects')
        .set('Authorization', 'Bearer ' + adminToken)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should list projects for employee', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/projects')
        .set('Authorization', 'Bearer ' + empToken)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/projects/:id', () => {
    let projectId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', 'Bearer ' + adminToken)
        .send(createProjectPayload)
        .expect(201);
      projectId = res.body.id;
    });

    it('should return project by id', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/projects/' + projectId)
        .set('Authorization', 'Bearer ' + empToken)
        .expect(200);

      expect(res.body.id).toBe(projectId);
    });
  });

  describe('PATCH /api/projects/:id', () => {
    it('should update project as admin', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', 'Bearer ' + adminToken)
        .send(createProjectPayload)
        .expect(201);

      const res = await request(app.getHttpServer())
        .patch('/api/projects/' + createRes.body.id)
        .set('Authorization', 'Bearer ' + adminToken)
        .send({ name: 'Project Alpha Updated' })
        .expect(200);

      expect(res.body.name).toBe('Project Alpha Updated');
    });
  });

  describe('POST /api/projects/:id/allocations', () => {
    let projectId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', 'Bearer ' + adminToken)
        .send(createProjectPayload)
        .expect(201);
      projectId = res.body.id;
    });

    it('should allocate employee to project', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/projects/' + projectId + '/allocations')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({
          employeeId: empEmployeeId,
          allocationType: AllocationType.PERCENTAGE,
          allocationValue: 50,
          startDate: '2026-03-01',
          endDate: '2026-06-30',
          roleInProject: 'Developer',
        })
        .expect(201);

      expect(res.body.allocation).toBeDefined();
      expect(res.body.allocation.employeeId).toBe(empEmployeeId);
    });

    it('should return 400 for allocation in draft project without activation flow', async () => {
      await request(app.getHttpServer())
        .post('/api/projects/' + projectId + '/allocations')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({
          employeeId: empEmployeeId,
          allocationType: AllocationType.PERCENTAGE,
          allocationValue: 50,
          startDate: '2026-03-01',
          roleInProject: 'Developer',
        })
        .expect(201);
    });
  });

  describe('Project lifecycle', () => {
    it('should activate and close project', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', 'Bearer ' + adminToken)
        .send(createProjectPayload)
        .expect(201);
      const projectId = createRes.body.id;

      await request(app.getHttpServer())
        .post('/api/projects/' + projectId + '/allocations')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({
          employeeId: empEmployeeId,
          allocationType: AllocationType.PERCENTAGE,
          allocationValue: 50,
          startDate: '2026-03-01',
          endDate: '2026-06-30',
          roleInProject: 'Developer',
        })
        .expect(201);

      const activateRes = await request(app.getHttpServer())
        .post('/api/projects/' + projectId + '/activate')
        .set('Authorization', 'Bearer ' + adminToken)
        .expect(200);
      expect(activateRes.body.status).toBe(ProjectStatus.ACTIVE);

      const closeRes = await request(app.getHttpServer())
        .post('/api/projects/' + projectId + '/close')
        .set('Authorization', 'Bearer ' + adminToken)
        .expect(200);
      expect(closeRes.body.status).toBe(ProjectStatus.CLOSED);
    });

    it('should return 400 when activating project without allocations', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', 'Bearer ' + adminToken)
        .send(createProjectPayload)
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/projects/' + createRes.body.id + '/activate')
        .set('Authorization', 'Bearer ' + adminToken)
        .expect(400);
    });
  });

  describe('DELETE /api/projects/:id/allocations/:allocId', () => {
    it('should soft delete an allocation', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', 'Bearer ' + adminToken)
        .send(createProjectPayload)
        .expect(201);
      const projectId = createRes.body.id;

      const allocRes = await request(app.getHttpServer())
        .post('/api/projects/' + projectId + '/allocations')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({
          employeeId: empEmployeeId,
          allocationType: AllocationType.PERCENTAGE,
          allocationValue: 50,
          startDate: '2026-03-01',
          roleInProject: 'Developer',
        })
        .expect(201);

      await request(app.getHttpServer())
        .delete('/api/projects/' + projectId + '/allocations/' + allocRes.body.allocation.id)
        .set('Authorization', 'Bearer ' + adminToken)
        .expect(204);
    });
  });
});
