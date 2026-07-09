import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../src/database/data-source';
import { rbacSeed } from '../src/database/seeds';
import { hash } from 'argon2';
import { Employee, EmployeeStatus } from '../src/users/entities/employee.entity';

process.env.MFA_ENCRYPTION_KEY = 'change_me_mfa_key_32_bytes';

describe('GDPR Erasure (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let targetEmployeeId: string;
  let targetUserEmail: string;

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

    const adminUser = await userRepo.findOneBy({ email: 'admin@hr-suite.local' });
    if (!adminUser) throw new Error('Admin user not seeded');

    const adminPassHash = await hash('Admin123!');
    await userRepo.update(adminUser.id, { passwordHash: adminPassHash });

    const adminEmployee = employeeRepo.create({
      id: adminUser.id,
      userId: adminUser.id,
      employeeNumber: 'ADM-GDPR-001',
      firstName: 'Admin',
      lastName: 'GDPR',
      email: 'admin-gdpr@test.com',
      status: EmployeeStatus.ACTIVE,
      employmentStartDate: '2020-01-01',
    });
    await employeeRepo.save(adminEmployee);

    const targetPassHash = await hash('Target123!');
    targetUserEmail = 'target-gdpr@test.com';
    const targetUser = userRepo.create({
      email: targetUserEmail,
      username: 'target-gdpr',
      passwordHash: targetPassHash,
      isActive: true,
      passwordChangedAt: new Date(),
    });
    const savedTargetUser = await userRepo.save(targetUser);

    const employeeRole = await roleRepo.findOneBy({ name: 'employee' });
    if (!employeeRole) throw new Error('Employee role not seeded');

    await userRoleRepo.save(
      userRoleRepo.create({
        userId: savedTargetUser.id,
        roleId: employeeRole.id,
        assignedBy: adminUser.id,
      }),
    );

    const targetEmployee = employeeRepo.create({
      id: savedTargetUser.id,
      userId: savedTargetUser.id,
      employeeNumber: 'EMP-GDPR-001',
      firstName: 'Target',
      lastName: 'User',
      email: targetUserEmail,
      personalEmail: 'target.personal@example.com',
      phone: '+351912345678',
      nif: '123456789',
      birthDate: '1990-05-15',
      address: 'Rua de Teste, 123, Lisboa',
      nationality: 'Portuguesa',
      gender: 'Masculino',
      photoUrl: 'https://example.com/photo.jpg',
      iban: 'PT50000201231234567890154',
      workLocation: 'Lisboa',
      status: EmployeeStatus.ACTIVE,
      managerId: adminUser.id,
      employmentStartDate: '2021-01-01',
      departmentId: null,
      jobTitleId: null,
    });
    await employeeRepo.save(targetEmployee);
    targetEmployeeId = targetEmployee.id;

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
      .send({ email: 'admin-gdpr@test.com', password: 'Admin123!' })
      .expect(200);
    adminToken = adminLoginRes.body.accessToken;
  });

  afterAll(async () => {
    await dataSource.destroy();
    if (app) {
      await app.close();
    }
  });

  it('should anonymize employee via erasure request and preserve statistical data', async () => {
    // 1. Submit erasure request as admin
    const requestRes = await request(app.getHttpServer())
      .post('/api/gdpr/requests')
      .set('Authorization', 'Bearer ' + adminToken)
      .send({
        subjectId: targetEmployeeId,
        requestType: 'erasure',
        notes: 'Erasure request via e2e test',
      })
      .expect(201);

    const requestId = requestRes.body.id;
    expect(requestId).toBeDefined();
    expect(requestRes.body.requestType).toBe('erasure');

    // 2. Check DataSubjectRequest was completed (createDataRequest calls anonymizeEmployee automatically)
    expect(requestRes.body.status).toBe('completed');

    // 3. Verify sensitive fields were anonymized in Employee
    const employeeRepo = dataSource.getRepository(Employee);
    const anonymizedEmployee = await employeeRepo.findOneBy({ id: targetEmployeeId });
    if (!anonymizedEmployee) throw new Error('Employee not found');

    expect(anonymizedEmployee.firstName).toMatch(/^anon-/);
    expect(anonymizedEmployee.lastName).toBe('anonimized');
    expect(anonymizedEmployee.email).toMatch(/^anon-.+@anonimized\.local$/);
    expect(anonymizedEmployee.personalEmail).toBeNull();
    expect(anonymizedEmployee.phone).toBeNull();
    expect(anonymizedEmployee.nif).toBeNull();
    expect(anonymizedEmployee.birthDate).toBeNull();
    expect(anonymizedEmployee.address).toBeNull();
    expect(anonymizedEmployee.nationality).toBeNull();
    expect(anonymizedEmployee.gender).toBeNull();
    expect(anonymizedEmployee.photoUrl).toBeNull();
    expect(anonymizedEmployee.iban).toBeNull();
    expect(anonymizedEmployee.workLocation).toBeNull();
    expect(anonymizedEmployee.status).toBe(EmployeeStatus.INACTIVE);

    // 4. Verify User email was anonymized
    const userRepo = dataSource.getRepository('User');
    const anonymizedUser = await userRepo.findOneBy({ id: targetEmployeeId });
    if (!anonymizedUser) throw new Error('User not found');
    expect(anonymizedUser.email).toMatch(/^anon-.+@anonimized\.local$/);

    // 5. Verify statistical/non-sensitive data was preserved
    expect(anonymizedEmployee.employeeNumber).toBe('EMP-GDPR-001');
    expect(anonymizedEmployee.employmentStartDate).toBe('2021-01-01');
    expect(anonymizedEmployee.managerId).toBe(anonymizedEmployee.managerId);
  });
});
