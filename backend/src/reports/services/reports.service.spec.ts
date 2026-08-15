import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ReportsService } from './reports.service';
import { ReportExportersService } from './report-exporters.service';
import { ReportsRabbitmqService } from './reports-rabbitmq.service';
import { StorageService } from '../../storage/services/storage.service';
import { ReportJob } from '../entities/report-job.entity';
import { ReportType } from '../entities/report-type.enum';
import { ReportFormat } from '../entities/report-format.enum';
import { ReportJobStatus } from '../entities/report-job-status.enum';
import { EmployeeStatus } from '../../users/entities/employee.entity';
import { ContractStatus } from '../../contracts/entities/contract.entity';

const mockRepository = {
  create: jest.fn().mockImplementation((dto: Record<string, unknown>) => {
    const job = new ReportJob();
    Object.assign(job, dto);
    return job;
  }),
  save: jest.fn().mockImplementation((entity: ReportJob) => {
    const job = new ReportJob();
    Object.assign(job, entity, { id: 'job-1' });
    return Promise.resolve(job);
  }),
  findOne: jest.fn(),
  update: jest.fn().mockResolvedValue(undefined),
};

const mockDataSource = {
  getRepository: jest.fn().mockReturnValue({
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    createQueryBuilder: jest.fn().mockReturnValue({
      innerJoin: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
      getRawOne: jest.fn().mockResolvedValue(null),
      getMany: jest.fn().mockResolvedValue([]),
    }),
  }),
};

const mockExporter = {
  generateExcel: jest.fn().mockResolvedValue(Buffer.from('xlsx')),
  generatePdf: jest.fn().mockResolvedValue(Buffer.from('pdf')),
};

const mockRabbitmq = {
  publishReportJob: jest.fn().mockResolvedValue(undefined),
};

const mockStorage = {
  upload: jest.fn().mockResolvedValue('reports/job-1/audit-123.json'),
  getObjectStream: jest
    .fn()
    .mockResolvedValue({ body: 'fake-stream', contentType: 'application/pdf' }),
};

describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: getRepositoryToken(ReportJob), useValue: mockRepository },
        { provide: DataSource, useValue: mockDataSource },
        { provide: ReportExportersService, useValue: mockExporter },
        { provide: ReportsRabbitmqService, useValue: mockRabbitmq },
        { provide: StorageService, useValue: mockStorage },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    jest.clearAllMocks();
  });

  it('should create a pending report job', async () => {
    const job = await service.createJob(ReportType.AUDIT, {}, ReportFormat.JSON);

    expect(job.reportType).toBe(ReportType.AUDIT);
    expect(job.status).toBe(ReportJobStatus.PENDING);
    expect(job.id).toBe('job-1');
  });

  it('should return columns for each report type', () => {
    const columns = service.getColumns(ReportType.TIMESHEETS);

    expect(columns.length).toBeGreaterThan(0);
    expect(columns[0]).toHaveProperty('key');
    expect(columns[0]).toHaveProperty('header');
  });

  it('should return async job for large xlsx reports', async () => {
    const manyRows = Array.from({ length: 1001 }, (_, index) => ({ id: index }));
    jest.spyOn(service, 'fetchRows').mockResolvedValue(manyRows);

    const result = await service.generateReport(ReportType.AUDIT, {}, ReportFormat.XLSX);

    expect(result.jobId).toBe('job-1');
    expect(mockRabbitmq.publishReportJob).toHaveBeenCalled();
  });

  it('should return buffer and row count from generateBuffer', async () => {
    const rows = [{ id: 1 }, { id: 2 }, { id: 3 }];
    jest.spyOn(service, 'fetchRows').mockResolvedValue(rows);

    const result = await service.generateBuffer(ReportType.AUDIT, {}, ReportFormat.XLSX);

    expect(result.buffer).toEqual(Buffer.from('xlsx'));
    expect(result.rowCount).toBe(3);
  });

  it('should upload the buffer to storage and return the storage key', async () => {
    const key = await service.persistJobResult(
      'job-1',
      ReportType.AUDIT,
      ReportFormat.PDF,
      Buffer.from('pdf'),
    );

    expect(mockStorage.upload).toHaveBeenCalledWith(
      expect.stringContaining('reports/job-1/'),
      Buffer.from('pdf'),
      'application/pdf',
    );
    expect(key).toContain('reports/job-1/');
  });

  it('should return a file stream for a completed job', async () => {
    mockRepository.findOne.mockResolvedValue(
      Object.assign(new ReportJob(), {
        id: 'job-1',
        status: ReportJobStatus.COMPLETED,
        format: ReportFormat.PDF,
        resultUrl: 'reports/job-1/audit-123.pdf',
      }),
    );

    const file = await service.getJobFile('job-1');

    expect(file.filename).toBe('audit-123.pdf');
    expect(file.contentType).toBe('application/pdf');
    expect(file.stream).toBe('fake-stream');
    expect(mockStorage.getObjectStream).toHaveBeenCalledWith('reports/job-1/audit-123.pdf');
  });

  it('should reject download for a job that is not completed', async () => {
    mockRepository.findOne.mockResolvedValue(
      Object.assign(new ReportJob(), {
        id: 'job-1',
        status: ReportJobStatus.PENDING,
        resultUrl: null,
      }),
    );

    await expect(service.getJobFile('job-1')).rejects.toThrow(BadRequestException);
  });

  describe('resolveEmployeeScope', () => {
    const employeeRepo = mockDataSource.getRepository() as {
      findOne: jest.Mock;
      find: jest.Mock;
    };

    afterEach(() => {
      employeeRepo.findOne.mockResolvedValue(null);
      employeeRepo.find.mockResolvedValue([]);
    });

    it('should return the explicit employeeId unrestricted for ADMIN', async () => {
      const result = await service.resolveEmployeeScope(['admin'], 'user-1', 'emp-5');

      expect(result).toEqual({ employeeId: 'emp-5' });
      expect(employeeRepo.findOne).not.toHaveBeenCalled();
    });

    it('should return no restriction for ADMIN without an explicit employeeId', async () => {
      const result = await service.resolveEmployeeScope(['admin'], 'user-1', '');

      expect(result).toEqual({});
    });

    it('should throw when the authenticated user has no Employee record', async () => {
      employeeRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.resolveEmployeeScope(['employee'], 'user-x', '')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should resolve the caller Employee.id from the JWT userId for EMPLOYEE role', async () => {
      employeeRepo.findOne.mockResolvedValueOnce({ id: 'emp-1', userId: 'user-1' });

      const result = await service.resolveEmployeeScope(['employee'], 'user-1', '');

      expect(employeeRepo.findOne).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
      expect(result).toEqual({ employeeId: 'emp-1' });
    });

    it('should deny an EMPLOYEE requesting another colaborador data', async () => {
      employeeRepo.findOne.mockResolvedValueOnce({ id: 'emp-1', userId: 'user-1' });

      await expect(service.resolveEmployeeScope(['employee'], 'user-1', 'emp-2')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should scope a MANAGER without an explicit employeeId to themself and direct reports', async () => {
      employeeRepo.findOne.mockResolvedValueOnce({ id: 'mgr-1', userId: 'user-mgr' });
      employeeRepo.find.mockResolvedValueOnce([{ id: 'emp-2' }, { id: 'emp-3' }]);

      const result = await service.resolveEmployeeScope(['manager'], 'user-mgr', '');

      expect(employeeRepo.find).toHaveBeenCalledWith({
        where: { managerId: 'mgr-1' },
        select: ['id'],
      });
      expect(result).toEqual({ employeeIds: ['mgr-1', 'emp-2', 'emp-3'] });
    });

    it('should allow a MANAGER to request an explicit direct report', async () => {
      employeeRepo.findOne.mockResolvedValueOnce({ id: 'mgr-1', userId: 'user-mgr' });
      employeeRepo.find.mockResolvedValueOnce([{ id: 'emp-2' }]);

      const result = await service.resolveEmployeeScope(['manager'], 'user-mgr', 'emp-2');

      expect(result).toEqual({ employeeId: 'emp-2' });
    });

    it('should deny a MANAGER requesting an employee outside their team', async () => {
      employeeRepo.findOne.mockResolvedValueOnce({ id: 'mgr-1', userId: 'user-mgr' });
      employeeRepo.find.mockResolvedValueOnce([{ id: 'emp-2' }]);

      await expect(service.resolveEmployeeScope(['manager'], 'user-mgr', 'emp-99')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  interface FindOperatorLike {
    type: string;
    value: unknown;
  }

  describe('generateMarginReport', () => {
    const employeeRepo = mockDataSource.getRepository() as { find: jest.Mock };

    it('should filter employees by employeeIds when provided (MANAGER scope)', async () => {
      let capturedWhere: { status: EmployeeStatus; id?: FindOperatorLike } | undefined;
      employeeRepo.find.mockImplementationOnce(
        (options: { where: { status: EmployeeStatus; id?: FindOperatorLike } }) => {
          capturedWhere = options.where;
          return Promise.resolve([]);
        },
      );

      await service.generateMarginReport('2026-07', ['emp-1', 'emp-2']);

      expect(capturedWhere?.status).toBe(EmployeeStatus.ACTIVE);
      expect(capturedWhere?.id?.type).toBe('in');
      expect(capturedWhere?.id?.value).toEqual(['emp-1', 'emp-2']);
    });

    it('should not restrict employees when employeeIds is empty (ADMIN scope)', async () => {
      let capturedWhere: Record<string, unknown> | undefined;
      employeeRepo.find.mockImplementationOnce((options: { where: Record<string, unknown> }) => {
        capturedWhere = options.where;
        return Promise.resolve([]);
      });

      await service.generateMarginReport('2026-07');

      expect(capturedWhere).toEqual({ status: EmployeeStatus.ACTIVE });
    });
  });

  describe('generateContractsExpiringReport', () => {
    const contractRepo = mockDataSource.getRepository() as { find: jest.Mock };

    it('should filter contracts by employeeIds when provided (MANAGER scope)', async () => {
      let capturedWhere: { status: ContractStatus; employeeId?: FindOperatorLike } | undefined;
      contractRepo.find.mockImplementationOnce(
        (options: { where: { status: ContractStatus; employeeId?: FindOperatorLike } }) => {
          capturedWhere = options.where;
          return Promise.resolve([]);
        },
      );

      await service.generateContractsExpiringReport(30, ['emp-1']);

      expect(capturedWhere?.status).toBe(ContractStatus.ACTIVE);
      expect(capturedWhere?.employeeId?.type).toBe('in');
      expect(capturedWhere?.employeeId?.value).toEqual(['emp-1']);
    });

    it('should not restrict contracts when employeeIds is empty (ADMIN scope)', async () => {
      let capturedWhere: { employeeId?: unknown } | undefined;
      contractRepo.find.mockImplementationOnce((options: { where: { employeeId?: unknown } }) => {
        capturedWhere = options.where;
        return Promise.resolve([]);
      });

      await service.generateContractsExpiringReport(30);

      expect(capturedWhere?.employeeId).toBeUndefined();
    });
  });
});
