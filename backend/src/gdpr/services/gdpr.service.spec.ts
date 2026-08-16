import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GdprService } from './gdpr.service';
import { ConsentRecord } from '../entities/consent-record.entity';
import { DataSubjectRequest } from '../entities/data-subject-request.entity';
import { DataSubjectRequestStatus } from '../entities/data-subject-request-status.enum';
import { RetentionPolicy } from '../entities/retention-policy.entity';
import { SecurityIncident } from '../entities/security-incident.entity';
import { SecurityIncidentStatus } from '../entities/security-incident-status.enum';
import { SecurityIncidentSeverity } from '../entities/security-incident-severity.enum';
import { DataSubjectRequestType } from '../entities/data-subject-request-type.enum';
import { Employee, EmployeeStatus } from '../../users/entities/employee.entity';
import { User } from '../../auth/entities/user.entity';
import { AuditLog } from '../../audit/entities/audit-log.entity';
import { AdminService } from '../../admin/admin.service';
import { PersonalDataExportedEvent } from '../events/personal-data-exported.event';

function createMockQueryBuilder(
  overrides: Record<string, jest.Mock> = {},
): Record<string, jest.Mock> {
  return {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getRawMany: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
}

const createMockRepository = (): {
  findOne: jest.Mock;
  find: jest.Mock;
  save: jest.Mock;
  create: jest.Mock;
  count: jest.Mock;
  createQueryBuilder: jest.Mock;
} => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  save: jest.fn().mockImplementation((entity: unknown) => Promise.resolve(entity)),
  create: jest.fn().mockImplementation((dto: unknown) => dto),
  count: jest.fn().mockResolvedValue(0),
  createQueryBuilder: jest.fn().mockReturnValue(createMockQueryBuilder()),
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

const mockAdminService = {
  getSettings: jest.fn().mockResolvedValue({ gdprPostExitRetentionYears: 5 }),
};

describe('GdprService', () => {
  let service: GdprService;
  let employeeRepository: ReturnType<typeof createMockRepository>;
  let userRepository: ReturnType<typeof createMockRepository>;
  let auditLogRepository: ReturnType<typeof createMockRepository>;
  let requestRepository: ReturnType<typeof createMockRepository>;
  let incidentRepository: ReturnType<typeof createMockRepository>;
  let retentionRepository: ReturnType<typeof createMockRepository>;
  let consentRepository: ReturnType<typeof createMockRepository>;

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
        { provide: AdminService, useValue: mockAdminService },
      ],
    }).compile();

    service = module.get<GdprService>(GdprService);
    employeeRepository = module.get(getRepositoryToken(Employee));
    userRepository = module.get(getRepositoryToken(User));
    auditLogRepository = module.get(getRepositoryToken(AuditLog));
    requestRepository = module.get(getRepositoryToken(DataSubjectRequest));
    incidentRepository = module.get(getRepositoryToken(SecurityIncident));
    retentionRepository = module.get(getRepositoryToken(RetentionPolicy));
    consentRepository = module.get(getRepositoryToken(ConsentRecord));

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
      expect.objectContaining({ action: 'DataAnonymized', entityType: 'Employee' }),
    );
    expect(mockEventEmitter.emit).toHaveBeenCalledWith('gdpr.data.anonymized', expect.any(Object));
  });

  it('should throw when anonymizing unknown employee', async () => {
    employeeRepository.findOne.mockResolvedValue(null);

    await expect(service.anonymizeEmployee('unknown')).rejects.toThrow(
      'Colaborador não encontrado',
    );
  });

  it('should return 0 when there are no active policies and no employees past the implicit gdprPostExitRetentionYears cutoff', async () => {
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
        { provide: AdminService, useValue: mockAdminService },
      ],
    }).compile();

    const testService = module.get<GdprService>(GdprService);
    const count = await testService.runRetentionPolicies();

    expect(mockAdminService.getSettings).toHaveBeenCalled();
    expect(count).toBe(0);
  });

  it('should anonymize inactive employees past gdprPostExitRetentionYears with no explicit RetentionPolicy configured', async () => {
    const retentionRepository = createMockRepository();
    retentionRepository.find.mockResolvedValue([]);
    const employeeRepository = createMockRepository();
    const pastDueEmployee = new Employee();
    pastDueEmployee.id = 'emp-past-due';
    pastDueEmployee.userId = 'user-past-due';
    pastDueEmployee.status = EmployeeStatus.INACTIVE;
    pastDueEmployee.user = new User();
    pastDueEmployee.user.id = 'user-past-due';
    employeeRepository.find.mockResolvedValue([pastDueEmployee]);
    employeeRepository.findOne.mockResolvedValue(pastDueEmployee);
    const userRepository = createMockRepository();
    const auditLogRepository = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GdprService,
        { provide: getRepositoryToken(ConsentRecord), useValue: createMockRepository() },
        { provide: getRepositoryToken(DataSubjectRequest), useValue: createMockRepository() },
        { provide: getRepositoryToken(RetentionPolicy), useValue: retentionRepository },
        { provide: getRepositoryToken(SecurityIncident), useValue: createMockRepository() },
        { provide: getRepositoryToken(Employee), useValue: employeeRepository },
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: getRepositoryToken(AuditLog), useValue: auditLogRepository },
        { provide: DataSource, useValue: mockDataSource },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: AdminService, useValue: mockAdminService },
      ],
    }).compile();

    const testService = module.get<GdprService>(GdprService);
    const count = await testService.runRetentionPolicies();

    expect(count).toBe(1);
    expect(employeeRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'emp-past-due', status: EmployeeStatus.INACTIVE }),
    );
  });

  it('should reject a pending request with notes', async () => {
    const request = new DataSubjectRequest();
    request.id = 'req-1';
    request.status = DataSubjectRequestStatus.PENDING;

    requestRepository.findOne.mockResolvedValue(request);

    const result = await service.rejectRequest('req-1', 'Sem fundamento legal');

    expect(result.status).toBe(DataSubjectRequestStatus.REJECTED);
    expect(result.responseNotes).toBe('Sem fundamento legal');
    expect(result.completedAt).toBeInstanceOf(Date);
  });

  it('should throw when rejecting an unknown request', async () => {
    requestRepository.findOne.mockResolvedValue(null);

    await expect(service.rejectRequest('unknown', 'notes')).rejects.toThrow(
      'Pedido não encontrado',
    );
  });

  it('should update a security incident status and resolution notes', async () => {
    const incident = new SecurityIncident();
    incident.id = 'inc-1';
    incident.status = SecurityIncidentStatus.OPEN;

    incidentRepository.findOne.mockResolvedValue(incident);

    const result = await service.updateIncident('inc-1', {
      status: SecurityIncidentStatus.RESOLVED,
      resolutionNotes: 'Corrigido',
    });

    expect(result.status).toBe(SecurityIncidentStatus.RESOLVED);
    expect(result.resolutionNotes).toBe('Corrigido');
  });

  it('should throw when updating an unknown incident', async () => {
    incidentRepository.findOne.mockResolvedValue(null);

    await expect(service.updateIncident('unknown', { resolutionNotes: 'x' })).rejects.toThrow(
      'Incidente não encontrado',
    );
  });

  it('should toggle a retention policy active flag', async () => {
    const policy = new RetentionPolicy();
    policy.id = 'pol-1';
    policy.isActive = true;

    retentionRepository.findOne.mockResolvedValue(policy);

    const result = await service.updateRetentionPolicy('pol-1', { isActive: false });

    expect(result.isActive).toBe(false);
  });

  it('should throw when updating an unknown retention policy', async () => {
    retentionRepository.findOne.mockResolvedValue(null);

    await expect(service.updateRetentionPolicy('unknown', { isActive: false })).rejects.toThrow(
      'Política de retenção não encontrada',
    );
  });

  it('should emit gdpr.request.completed when completing a request', async () => {
    const request = new DataSubjectRequest();
    request.id = 'req-1';
    request.subjectId = 'emp-1';
    request.requestType = DataSubjectRequestType.RECTIFICATION;
    request.status = DataSubjectRequestStatus.PENDING;

    requestRepository.findOne.mockResolvedValue(request);

    await service.completeRequest('req-1', 'Concluído');

    expect(mockEventEmitter.emit).toHaveBeenCalledWith(
      'gdpr.request.completed',
      expect.objectContaining({ requestId: 'req-1', subjectId: 'emp-1' }),
    );
  });

  it('should emit gdpr.incident.escalated for a CRITICAL incident without SMTP configured', async () => {
    const result = await service.reportIncident({
      title: 'Acesso indevido',
      severity: SecurityIncidentSeverity.CRITICAL,
    });

    expect(mockEventEmitter.emit).toHaveBeenCalledWith(
      'gdpr.incident.escalated',
      expect.objectContaining({
        incidentId: result.id,
        severity: SecurityIncidentSeverity.CRITICAL,
      }),
    );
  });

  it('should not emit gdpr.incident.escalated for a LOW severity incident', async () => {
    await service.reportIncident({
      title: 'Evento menor',
      severity: SecurityIncidentSeverity.LOW,
    });

    expect(mockEventEmitter.emit).not.toHaveBeenCalledWith(
      'gdpr.incident.escalated',
      expect.anything(),
    );
  });

  it('should emit gdpr.data.exported when an ACCESS request is created', async () => {
    const employee = new Employee();
    employee.id = 'emp-1';
    employeeRepository.findOne.mockResolvedValue(employee);
    requestRepository.findOne.mockResolvedValue({
      id: 'req-1',
      subjectId: 'emp-1',
      requestType: DataSubjectRequestType.ACCESS,
      status: DataSubjectRequestStatus.PENDING,
    });

    await service.createDataRequest({
      subjectId: 'emp-1',
      requestType: DataSubjectRequestType.ACCESS,
    });

    expect(mockEventEmitter.emit).toHaveBeenCalledWith(
      'gdpr.data.exported',
      expect.objectContaining({ subjectId: 'emp-1', requestType: DataSubjectRequestType.ACCESS }),
    );
  });

  it('handleDataExported deve gravar um DataExported em hr.audit_logs', async () => {
    await service.handleDataExported(
      new PersonalDataExportedEvent('emp-1', 'req-1', DataSubjectRequestType.ACCESS),
    );

    expect(auditLogRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DataExported',
        entityType: 'Employee',
        entityId: 'emp-1',
        module: 'gdpr',
        newValues: { requestId: 'req-1', requestType: DataSubjectRequestType.ACCESS },
      }),
    );
  });

  it('getConsentsReport deve listar só consentimentos ativos', async () => {
    consentRepository.find.mockResolvedValue([{ id: 'consent-1', isActive: true }]);

    const result = await service.getConsentsReport();

    expect(consentRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true } }),
    );
    expect(result).toEqual([{ id: 'consent-1', isActive: true }]);
  });

  it('getAccessHistoryReport deve filtrar por período quando startDate/endDate são fornecidos', async () => {
    auditLogRepository.find.mockResolvedValue([{ id: 'log-1' }]);

    const result = await service.getAccessHistoryReport('2026-01-01', '2026-01-31');

    const [callArg] = auditLogRepository.find.mock.calls[0] as [{ where: { timestamp?: unknown } }];
    expect(callArg.where.timestamp).toBeDefined();
    expect(result).toEqual([{ id: 'log-1' }]);
  });

  it('getAccessHistoryReport deve devolver tudo quando não há filtro de período', async () => {
    auditLogRepository.find.mockResolvedValue([{ id: 'log-1' }, { id: 'log-2' }]);

    const result = await service.getAccessHistoryReport();

    expect(auditLogRepository.find).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
    expect(result).toHaveLength(2);
  });

  it('getErasureAndAnonymizationReport deve combinar pedidos ERASURE e anonimizações automáticas de retenção', async () => {
    requestRepository.find.mockResolvedValue([{ id: 'req-1', requestType: 'erasure' }]);
    const queryBuilder = createMockQueryBuilder({
      getMany: jest.fn().mockResolvedValue([{ id: 'log-1', action: 'DataAnonymized' }]),
    });
    auditLogRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.getErasureAndAnonymizationReport();

    expect(result.requests).toEqual([{ id: 'req-1', requestType: 'erasure' }]);
    expect(result.automaticAnonymizations).toEqual([{ id: 'log-1', action: 'DataAnonymized' }]);
    expect(queryBuilder.where).toHaveBeenCalledWith('audit.action = :action', {
      action: 'DataAnonymized',
    });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      "audit.new_values->>'triggeredBy' = :triggeredBy",
      { triggeredBy: 'retention' },
    );
  });

  it('getExportsReport deve listar pedidos ACCESS/PORTABILITY completados', async () => {
    requestRepository.find.mockResolvedValue([{ id: 'req-2', requestType: 'access' }]);

    const result = await service.getExportsReport();

    const [callArg] = requestRepository.find.mock.calls[0] as [{ where: { status: string } }];
    expect(callArg.where.status).toBe(DataSubjectRequestStatus.COMPLETED);
    expect(result).toEqual([{ id: 'req-2', requestType: 'access' }]);
  });

  it('getAuditByModuleReport deve agregar contagens por módulo', async () => {
    const queryBuilder = createMockQueryBuilder({
      getRawMany: jest.fn().mockResolvedValue([
        { module: 'gdpr', count: '3' },
        { module: 'absences', count: '1' },
      ]),
    });
    auditLogRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.getAuditByModuleReport();

    expect(result).toEqual([
      { module: 'gdpr', count: 3 },
      { module: 'absences', count: 1 },
    ]);
  });
});
