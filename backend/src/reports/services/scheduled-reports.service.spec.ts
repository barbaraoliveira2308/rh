import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as nodemailer from 'nodemailer';
import { ScheduledReportsService } from './scheduled-reports.service';
import { ScheduledReport } from '../entities/scheduled-report.entity';
import { ReportFrequency } from '../entities/report-frequency.enum';
import { ReportFormat } from '../entities/report-format.enum';
import { ReportType } from '../entities/report-type.enum';
import { ReportsService } from './reports.service';
import { ReportsRabbitmqService } from './reports-rabbitmq.service';

const mockSendMail = jest.fn();

function assertDate(value: Date | null): Date {
  if (!value) {
    throw new Error('esperava-se uma data definida');
  }
  return value;
}

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

describe('ScheduledReportsService', () => {
  let mockScheduledRepo: Record<string, jest.Mock>;
  let mockReportsService: Record<string, jest.Mock>;
  let mockRabbitmq: Record<string, jest.Mock>;

  const buildModule = async (): Promise<ScheduledReportsService> => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduledReportsService,
        { provide: getRepositoryToken(ScheduledReport), useValue: mockScheduledRepo },
        { provide: ReportsService, useValue: mockReportsService },
        { provide: ReportsRabbitmqService, useValue: mockRabbitmq },
      ],
    }).compile();

    return module.get<ScheduledReportsService>(ScheduledReportsService);
  };

  beforeEach(() => {
    mockScheduledRepo = {
      create: jest.fn((data: Partial<ScheduledReport>) => data),
      save: jest.fn((data: Partial<ScheduledReport>) => Promise.resolve(data)),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    mockReportsService = {
      createJob: jest.fn().mockResolvedValue({ id: 'job-1' }),
    };
    mockRabbitmq = {
      publishReportJob: jest.fn(),
    };
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail: mockSendMail });
  });

  afterEach(() => {
    delete process.env.SMTP_HOST;
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('deve calcular nextRunAt um dia à frente para frequência diária', async () => {
      const service = await buildModule();
      const before = new Date();

      const result = await service.create({
        name: 'Relatório Diário',
        reportType: ReportType.TIMESHEETS,
        filters: {},
        frequency: ReportFrequency.DAILY,
        recipients: ['a@bridge351.pt'],
        format: ReportFormat.XLSX,
      });

      const expectedDiffDays = Math.round(
        (assertDate(result.nextRunAt).getTime() - before.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(expectedDiffDays).toBe(1);
      expect(result).toEqual(expect.objectContaining({ name: 'Relatório Diário', isActive: true }));
    });

    it('deve calcular nextRunAt uma semana à frente para frequência semanal', async () => {
      const service = await buildModule();
      const before = new Date();

      const result = await service.create({
        name: 'Relatório Semanal',
        reportType: ReportType.TIMESHEETS,
        filters: {},
        frequency: ReportFrequency.WEEKLY,
        recipients: ['a@bridge351.pt'],
        format: ReportFormat.XLSX,
      });

      const expectedDiffDays = Math.round(
        (assertDate(result.nextRunAt).getTime() - before.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(expectedDiffDays).toBe(7);
    });

    it('deve calcular nextRunAt um mês à frente para frequência mensal', async () => {
      const service = await buildModule();
      const before = new Date();
      const expected = new Date(before);
      expected.setMonth(expected.getMonth() + 1);

      const result = await service.create({
        name: 'Relatório Mensal',
        reportType: ReportType.TIMESHEETS,
        filters: {},
        frequency: ReportFrequency.MONTHLY,
        recipients: ['a@bridge351.pt'],
        format: ReportFormat.XLSX,
      });

      expect(assertDate(result.nextRunAt).getMonth()).toBe(expected.getMonth());
    });
  });

  describe('findAll', () => {
    it('deve mapear os itens para o DTO de resposta', async () => {
      const service = await buildModule();
      mockScheduledRepo.find.mockResolvedValue([
        {
          id: 's-1',
          name: 'Relatório',
          reportType: 'timesheets',
          frequency: 'daily',
        } as ScheduledReport,
      ]);

      const result = await service.findAll();

      expect(result).toEqual([expect.objectContaining({ id: 's-1', name: 'Relatório' })]);
    });
  });

  describe('remove', () => {
    it('deve lançar erro se o agendamento não existir', async () => {
      const service = await buildModule();
      mockScheduledRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow('Tarefa agendada não encontrada');
    });

    it('deve remover o agendamento encontrado', async () => {
      const service = await buildModule();
      const item = { id: 's-1' };
      mockScheduledRepo.findOne.mockResolvedValue(item);

      await service.remove('s-1');

      expect(mockScheduledRepo.remove).toHaveBeenCalledWith(item);
    });
  });

  describe('runScheduled', () => {
    it('deve processar os itens vencidos: criar o job, publicar na fila e atualizar as datas', async () => {
      const service = await buildModule();
      const dueItem = {
        id: 's-1',
        reportType: ReportType.TIMESHEETS,
        filters: {},
        format: ReportFormat.XLSX,
        frequency: ReportFrequency.DAILY,
      } as ScheduledReport;
      mockScheduledRepo.find.mockResolvedValue([dueItem]);

      await service.runScheduled();

      expect(mockReportsService.createJob).toHaveBeenCalledWith(
        ReportType.TIMESHEETS,
        {},
        ReportFormat.XLSX,
        's-1',
      );
      expect(mockRabbitmq.publishReportJob).toHaveBeenCalledWith(
        'job-1',
        ReportType.TIMESHEETS,
        {},
        ReportFormat.XLSX,
      );
      expect(mockScheduledRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 's-1', lastRunAt: expect.any(Date) as Date }),
      );
    });

    it('não deve propagar o erro se o processamento de um item falhar', async () => {
      const service = await buildModule();
      mockScheduledRepo.find.mockResolvedValue([
        {
          id: 's-1',
          reportType: ReportType.TIMESHEETS,
          filters: {},
          format: ReportFormat.XLSX,
          frequency: ReportFrequency.DAILY,
        },
      ]);
      mockReportsService.createJob.mockRejectedValue(new Error('falha ao criar job'));

      await expect(service.runScheduled()).resolves.toBeUndefined();
    });
  });

  describe('sendCompletedReport', () => {
    it('não deve enviar email nem lançar erro se o SMTP não estiver configurado', async () => {
      const service = await buildModule();

      await expect(
        service.sendCompletedReport(['a@bridge351.pt'], 'Assunto', Buffer.from('x'), 'r.xlsx'),
      ).resolves.toBeUndefined();
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    it('deve enviar o email com o anexo quando o SMTP está configurado', async () => {
      process.env.SMTP_HOST = 'smtp.bridge351.pt';
      const service = await buildModule();
      mockSendMail.mockResolvedValue(undefined);

      await service.sendCompletedReport(['a@bridge351.pt'], 'Assunto', Buffer.from('x'), 'r.xlsx');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['a@bridge351.pt'],
          subject: 'Assunto',
          attachments: [expect.objectContaining({ filename: 'r.xlsx' })],
        }),
      );
    });

    it('não deve propagar o erro se o envio de email falhar', async () => {
      process.env.SMTP_HOST = 'smtp.bridge351.pt';
      const service = await buildModule();
      mockSendMail.mockRejectedValue(new Error('falha SMTP'));

      await expect(
        service.sendCompletedReport(['a@bridge351.pt'], 'Assunto', Buffer.from('x'), 'r.xlsx'),
      ).resolves.toBeUndefined();
    });
  });
});
