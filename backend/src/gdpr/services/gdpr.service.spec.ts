import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GdprService } from './gdpr.service';
import { ConsentRecord } from '../entities/consent-record.entity';
import { DataSubjectRequest } from '../entities/data-subject-request.entity';
import { RetentionPolicy } from '../entities/retention-policy.entity';
import { SecurityIncident } from '../entities/security-incident.entity';
import { Employee, EmployeeStatus } from '../../users/entities/employee.entity';
import { User } from '../../auth/entities/user.entity';
import { AuditLog } from '../../audit/entities/audit-log.entity';

const createMockRepository = (): {
  findOne: jest.Mock;
  find: jest.Mock;
  save: jest.Mock;
  create: jest.Mock;
  count: jest.Mock;
} => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  save: jest.fn().mockImplementation((entity: unknown) => Promise.resolve(entity)),
  create: jest.fn().mockImplementation((dto: unknown) => dto),
  count: jest.fn().mockResolvedValue(0),
});

const mockDataSource = {
  getRepository: jest.fn().mockReturnValue({
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
  }),
};

const mockEventEmitter = {
  emit: jest.fn(),
};

describe('GdprService', () => {
  let service: GdprService;
  let employeeRepository: ReturnType<typeof createMockRepository>;
  let userRepository: ReturnType<typeof createMockRepository>;
  let auditLogRepository: ReturnType<typeof createMockRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GdprService,
        { provide: getRepositoryToken(ConsentRecord), useValue: createMockRepository() },
        { provide: getRepositoryToken(DataSubjectRequest), useValue: createMockRepository() },
        { provide: getRepositoryToken(RetentionPolicy), useValue: createMockRepository() },
        { provide: getRepositoryToken(SecurityIncident), useValue: createMockRepository() },
        { provide: getRepositoryToken(Employee), useValue: createMockRepository() },
        { provide: getRepositoryToken(User), useValue: createMockRepository() },
        { provide: getRepositoryToken(AuditLog), useValue: createMockRepository() },
        { provide: DataSource, useValue: mockDataSource },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<GdprService>(GdprService);
    employeeRepository = module.get(getRepositoryToken(Employee));
    userRepository = module.get(getRepositoryToken(User));
    auditLogRepository = module.get(getRepositoryToken(AuditLog));

    jest.clearAllMocks();
  });

  it('should anonymize sensitive employee fields', async () => {
    const employeeId = 'emp-1';
    const employee = new Employee();
    employee.id = employeeId;
    employee.userId = 'user-1';
    employee.firstName = 'Alice';
    employee.lastName = 'Silva';
    employee.email = 'alice@example.com';
    employee.personalEmail = 'alice.personal@example.com';
    employee.phone = '912345678';
    employee.nif = '123456789';
    employee.birthDate = '1990-01-01';
    employee.address = 'Rua X';
    employee.nationality = 'PT';
    employee.gender = 'female';
    employee.photoUrl = 'http://photo.jpg';
    employee.iban = 'PT5000020123456789015';
    employee.workLocation = 'Lisboa';
    employee.status = EmployeeStatus.ACTIVE;
    employee.user = new User();
    employee.user.id = 'user-1';
    employee.user.email = 'alice@example.com';

    employeeRepository.findOne.mockResolvedValue(employee);

    const result = await service.anonymizeEmployee(employeeId);

    expect(result.firstName).toContain('anon-');
    expect(result.lastName).toBe('anonimized');
    expect(result.email).toContain('@anonimized.local');
    expect(result.personalEmail).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.nif).toBeNull();
    expect(result.birthDate).toBeNull();
    expect(result.address).toBeNull();
    expect(result.gender).toBeNull();
    expect(result.photoUrl).toBeNull();
    expect(result.iban).toBeNull();
    expect(result.workLocation).toBeNull();
    expect(result.status).toBe(EmployeeStatus.INACTIVE);

    expect(userRepository.save).toHaveBeenCalled();
    expect(auditLogRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ANONYMIZE', entityType: 'Employee' }),
    );
    expect(mockEventEmitter.emit).toHaveBeenCalledWith('gdpr.data.anonymized', expect.any(Object));
  });

  it('should throw when anonymizing unknown employee', async () => {
    employeeRepository.findOne.mockResolvedValue(null);

    await expect(service.anonymizeEmployee('unknown')).rejects.toThrow(
      'Colaborador não encontrado',
    );
  });

  it('should skip retention run when no active policies exist', async () => {
    const retentionRepository = createMockRepository();
    retentionRepository.find.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GdprService,
        { provide: getRepositoryToken(ConsentRecord), useValue: createMockRepository() },
        { provide: getRepositoryToken(DataSubjectRequest), useValue: createMockRepository() },
        { provide: getRepositoryToken(RetentionPolicy), useValue: retentionRepository },
        { provide: getRepositoryToken(SecurityIncident), useValue: createMockRepository() },
        { provide: getRepositoryToken(Employee), useValue: createMockRepository() },
        { provide: getRepositoryToken(User), useValue: createMockRepository() },
        { provide: getRepositoryToken(AuditLog), useValue: createMockRepository() },
        { provide: DataSource, useValue: mockDataSource },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    const testService = module.get<GdprService>(GdprService);
    const count = await testService.runRetentionPolicies();

    expect(count).toBe(0);
  });
});
