import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ReportsService } from './reports.service';
import { ReportExportersService } from './report-exporters.service';
import { ReportsRabbitmqService } from './reports-rabbitmq.service';
import { ReportJob } from '../entities/report-job.entity';
import { ReportType } from '../entities/report-type.enum';
import { ReportFormat } from '../entities/report-format.enum';
import { ReportJobStatus } from '../entities/report-job-status.enum';

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
});
