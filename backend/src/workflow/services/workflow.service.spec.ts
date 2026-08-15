import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { WorkflowItem } from '../entities/workflow-item.entity';
import { WorkflowItemType } from '../entities/workflow-item-type.enum';
import { WorkflowItemStatus } from '../entities/workflow-item-status.enum';
import { TimesheetPeriod } from '../../timesheets/entities/timesheet-period.entity';
import { AbsenceRequest } from '../../absences/entities/absence-request.entity';
import { ExpenseReport } from '../../expenses/entities/expense-report.entity';
import { TimesheetsService } from '../../timesheets/services/timesheets.service';
import { AbsencesService } from '../../absences/services/absences.service';
import { ExpensesService } from '../../expenses/services/expenses.service';
import { TimesheetSubmittedEvent } from '../../timesheets/events/timesheet-submitted.event';
import { AbsenceRequestedEvent } from '../../absences/events/absence-requested.event';
import { ExpenseSubmittedEvent } from '../../expenses/events/expense-submitted.event';

describe('WorkflowService', () => {
  let service: WorkflowService;
  let mockWorkflowItemRepo: Record<string, jest.Mock>;
  let mockTimesheetPeriodRepo: Record<string, jest.Mock>;
  let mockAbsenceRequestRepo: Record<string, jest.Mock>;
  let mockExpenseReportRepo: Record<string, jest.Mock>;
  let mockTimesheetsService: Record<string, jest.Mock>;
  let mockAbsencesService: Record<string, jest.Mock>;
  let mockExpensesService: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockWorkflowItemRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    mockTimesheetPeriodRepo = {
      findOne: jest.fn(),
    };

    mockAbsenceRequestRepo = {
      findOne: jest.fn(),
    };

    mockExpenseReportRepo = {
      findOne: jest.fn(),
    };

    mockTimesheetsService = {
      approve: jest.fn(),
      reject: jest.fn(),
    };

    mockAbsencesService = {
      approve: jest.fn(),
      reject: jest.fn(),
    };

    mockExpensesService = {
      approve: jest.fn(),
      reject: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowService,
        { provide: getRepositoryToken(WorkflowItem), useValue: mockWorkflowItemRepo },
        { provide: getRepositoryToken(TimesheetPeriod), useValue: mockTimesheetPeriodRepo },
        { provide: getRepositoryToken(AbsenceRequest), useValue: mockAbsenceRequestRepo },
        { provide: getRepositoryToken(ExpenseReport), useValue: mockExpenseReportRepo },
        { provide: TimesheetsService, useValue: mockTimesheetsService },
        { provide: AbsencesService, useValue: mockAbsencesService },
        { provide: ExpensesService, useValue: mockExpensesService },
      ],
    }).compile();

    service = module.get<WorkflowService>(WorkflowService);
  });

  describe('findInbox', () => {
    it('deve retornar itens pendentes do utilizador por omissão', async () => {
      const items = [
        {
          id: 'wf-1',
          assigneeId: 'manager-1',
          status: WorkflowItemStatus.PENDING,
        },
      ];

      mockWorkflowItemRepo.find.mockResolvedValue(items);

      const result = await service.findInbox('manager-1');

      expect(result).toHaveLength(1);
      expect(mockWorkflowItemRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { assigneeId: 'manager-1', status: WorkflowItemStatus.PENDING },
        }),
      );
    });

    it('deve filtrar por status explícito quando fornecido', async () => {
      mockWorkflowItemRepo.find.mockResolvedValue([]);

      await service.findInbox('manager-1', WorkflowItemStatus.APPROVED);

      expect(mockWorkflowItemRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { assigneeId: 'manager-1', status: WorkflowItemStatus.APPROVED },
        }),
      );
    });
  });

  describe('countPending', () => {
    it('deve contar itens pendentes do utilizador', async () => {
      mockWorkflowItemRepo.count.mockResolvedValue(3);

      const result = await service.countPending('manager-1');

      expect(result).toBe(3);
      expect(mockWorkflowItemRepo.count).toHaveBeenCalledWith({
        where: { assigneeId: 'manager-1', status: WorkflowItemStatus.PENDING },
      });
    });
  });

  describe('approve', () => {
    it('deve lançar NotFoundException se o item não existir', async () => {
      mockWorkflowItemRepo.findOne.mockResolvedValue(null);

      await expect(service.approve('missing', 'manager-1')).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequestException se o item não estiver pendente', async () => {
      mockWorkflowItemRepo.findOne.mockResolvedValue({
        id: 'wf-1',
        status: WorkflowItemStatus.APPROVED,
        assigneeId: 'manager-1',
      });

      await expect(service.approve('wf-1', 'manager-1')).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException se o utilizador não for o responsável', async () => {
      mockWorkflowItemRepo.findOne.mockResolvedValue({
        id: 'wf-1',
        status: WorkflowItemStatus.PENDING,
        assigneeId: 'manager-1',
      });

      await expect(service.approve('wf-1', 'other-user')).rejects.toThrow(BadRequestException);
    });

    it('deve aprovar item TIMESHEET e delegar ao serviço', async () => {
      const item = {
        id: 'wf-1',
        type: WorkflowItemType.TIMESHEET,
        referenceId: 'period-1',
        assigneeId: 'manager-1',
        status: WorkflowItemStatus.PENDING,
      };

      mockWorkflowItemRepo.findOne.mockResolvedValue(item);
      mockWorkflowItemRepo.save.mockResolvedValue({ ...item, status: WorkflowItemStatus.APPROVED });

      const result = await service.approve('wf-1', 'manager-1');

      expect(result.status).toBe(WorkflowItemStatus.APPROVED);
      expect(mockTimesheetsService.approve).toHaveBeenCalledWith('period-1', 'manager-1');
    });

    it('deve aprovar item ABSENCE e delegar ao serviço', async () => {
      const item = {
        id: 'wf-2',
        type: WorkflowItemType.ABSENCE,
        referenceId: 'absence-1',
        assigneeId: 'manager-1',
        status: WorkflowItemStatus.PENDING,
      };

      mockWorkflowItemRepo.findOne.mockResolvedValue(item);
      mockWorkflowItemRepo.save.mockResolvedValue({ ...item, status: WorkflowItemStatus.APPROVED });

      await service.approve('wf-2', 'manager-1');

      expect(mockAbsencesService.approve).toHaveBeenCalledWith('absence-1', 'manager-1');
    });

    it('deve aprovar item EXPENSE e delegar ao serviço', async () => {
      const item = {
        id: 'wf-3',
        type: WorkflowItemType.EXPENSE,
        referenceId: 'report-1',
        assigneeId: 'manager-1',
        status: WorkflowItemStatus.PENDING,
      };

      mockWorkflowItemRepo.findOne.mockResolvedValue(item);
      mockWorkflowItemRepo.save.mockResolvedValue({ ...item, status: WorkflowItemStatus.APPROVED });

      await service.approve('wf-3', 'manager-1');

      expect(mockExpensesService.approve).toHaveBeenCalledWith('report-1', 'manager-1');
    });
  });

  describe('reject', () => {
    it('deve lançar NotFoundException se o item não existir', async () => {
      mockWorkflowItemRepo.findOne.mockResolvedValue(null);

      await expect(service.reject('missing', 'manager-1', 'Motivo')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar BadRequestException se o item não estiver pendente', async () => {
      mockWorkflowItemRepo.findOne.mockResolvedValue({
        id: 'wf-1',
        status: WorkflowItemStatus.REJECTED,
        assigneeId: 'manager-1',
      });

      await expect(service.reject('wf-1', 'manager-1', 'Motivo')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar BadRequestException se o utilizador não for o responsável', async () => {
      mockWorkflowItemRepo.findOne.mockResolvedValue({
        id: 'wf-1',
        status: WorkflowItemStatus.PENDING,
        assigneeId: 'manager-1',
      });

      await expect(service.reject('wf-1', 'other-user', 'Motivo')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve rejeitar item TIMESHEET e delegar ao serviço', async () => {
      const item = {
        id: 'wf-1',
        type: WorkflowItemType.TIMESHEET,
        referenceId: 'period-1',
        assigneeId: 'manager-1',
        status: WorkflowItemStatus.PENDING,
      };

      mockWorkflowItemRepo.findOne.mockResolvedValue(item);
      mockWorkflowItemRepo.save.mockResolvedValue({ ...item, status: WorkflowItemStatus.REJECTED });

      await service.reject('wf-1', 'manager-1', 'Motivo');

      expect(mockTimesheetsService.reject).toHaveBeenCalledWith('period-1', 'manager-1', 'Motivo');
    });

    it('deve rejeitar item ABSENCE e delegar ao serviço', async () => {
      const item = {
        id: 'wf-2',
        type: WorkflowItemType.ABSENCE,
        referenceId: 'absence-1',
        assigneeId: 'manager-1',
        status: WorkflowItemStatus.PENDING,
      };

      mockWorkflowItemRepo.findOne.mockResolvedValue(item);
      mockWorkflowItemRepo.save.mockResolvedValue({ ...item, status: WorkflowItemStatus.REJECTED });

      const result = await service.reject('wf-2', 'manager-1', 'Motivo');

      expect(result.status).toBe(WorkflowItemStatus.REJECTED);
      expect(mockAbsencesService.reject).toHaveBeenCalledWith('absence-1', 'manager-1', 'Motivo');
    });

    it('deve rejeitar item EXPENSE e delegar ao serviço, usando string vazia quando sem motivo', async () => {
      const item = {
        id: 'wf-3',
        type: WorkflowItemType.EXPENSE,
        referenceId: 'report-1',
        assigneeId: 'manager-1',
        status: WorkflowItemStatus.PENDING,
      };

      mockWorkflowItemRepo.findOne.mockResolvedValue(item);
      mockWorkflowItemRepo.save.mockResolvedValue({ ...item, status: WorkflowItemStatus.REJECTED });

      await service.reject('wf-3', 'manager-1', '');

      expect(mockExpensesService.reject).toHaveBeenCalledWith('report-1', 'manager-1', '');
    });
  });

  describe('handleTimesheetSubmitted', () => {
    const event = new TimesheetSubmittedEvent('period-1', 'emp-1', new Date('2026-08-01'));

    it('não deve criar item se o período não existir', async () => {
      mockTimesheetPeriodRepo.findOne.mockResolvedValue(null);

      await service.handleTimesheetSubmitted(event);

      expect(mockWorkflowItemRepo.save).not.toHaveBeenCalled();
    });

    it('não deve criar item se o colaborador não tiver manager', async () => {
      mockTimesheetPeriodRepo.findOne.mockResolvedValue({
        id: 'period-1',
        employeeId: 'emp-1',
        employee: { managerId: null },
      });

      await service.handleTimesheetSubmitted(event);

      expect(mockWorkflowItemRepo.save).not.toHaveBeenCalled();
    });

    it('não deve duplicar item se já existir um pendente para a mesma referência', async () => {
      mockTimesheetPeriodRepo.findOne.mockResolvedValue({
        id: 'period-1',
        employeeId: 'emp-1',
        employee: { managerId: 'manager-1' },
      });
      mockWorkflowItemRepo.findOne.mockResolvedValue({ id: 'existing-wf' });

      await service.handleTimesheetSubmitted(event);

      expect(mockWorkflowItemRepo.save).not.toHaveBeenCalled();
    });

    it('deve criar item de workflow para o manager do colaborador', async () => {
      mockTimesheetPeriodRepo.findOne.mockResolvedValue({
        id: 'period-1',
        employeeId: 'emp-1',
        employee: { managerId: 'manager-1' },
      });
      mockWorkflowItemRepo.findOne.mockResolvedValue(null);
      mockWorkflowItemRepo.create.mockImplementation((data: Record<string, unknown>) => data);
      mockWorkflowItemRepo.save.mockResolvedValue({});

      await service.handleTimesheetSubmitted(event);

      expect(mockWorkflowItemRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: WorkflowItemType.TIMESHEET,
          referenceId: 'period-1',
          referenceType: 'TimesheetPeriod',
          requesterId: 'emp-1',
          assigneeId: 'manager-1',
          status: WorkflowItemStatus.PENDING,
        }),
      );
      expect(mockWorkflowItemRepo.save).toHaveBeenCalled();
    });
  });

  describe('handleAbsenceRequested', () => {
    const event = new AbsenceRequestedEvent('absence-1', 'emp-1', 'type-1', new Date('2026-08-01'));

    it('não deve criar item se o pedido não existir', async () => {
      mockAbsenceRequestRepo.findOne.mockResolvedValue(null);

      await service.handleAbsenceRequested(event);

      expect(mockWorkflowItemRepo.save).not.toHaveBeenCalled();
    });

    it('não deve criar item se o colaborador não tiver manager', async () => {
      mockAbsenceRequestRepo.findOne.mockResolvedValue({
        id: 'absence-1',
        employee: { managerId: null },
      });

      await service.handleAbsenceRequested(event);

      expect(mockWorkflowItemRepo.save).not.toHaveBeenCalled();
    });

    it('não deve duplicar item se já existir um pendente para a mesma referência', async () => {
      mockAbsenceRequestRepo.findOne.mockResolvedValue({
        id: 'absence-1',
        employee: { managerId: 'manager-1' },
      });
      mockWorkflowItemRepo.findOne.mockResolvedValue({ id: 'existing-wf' });

      await service.handleAbsenceRequested(event);

      expect(mockWorkflowItemRepo.save).not.toHaveBeenCalled();
    });

    it('deve criar item de workflow para o manager do colaborador', async () => {
      mockAbsenceRequestRepo.findOne.mockResolvedValue({
        id: 'absence-1',
        employee: { managerId: 'manager-1' },
      });
      mockWorkflowItemRepo.findOne.mockResolvedValue(null);
      mockWorkflowItemRepo.create.mockImplementation((data: Record<string, unknown>) => data);
      mockWorkflowItemRepo.save.mockResolvedValue({});

      await service.handleAbsenceRequested(event);

      expect(mockWorkflowItemRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: WorkflowItemType.ABSENCE,
          referenceId: 'absence-1',
          referenceType: 'AbsenceRequest',
          requesterId: 'emp-1',
          assigneeId: 'manager-1',
          status: WorkflowItemStatus.PENDING,
        }),
      );
      expect(mockWorkflowItemRepo.save).toHaveBeenCalled();
    });
  });

  describe('handleExpenseSubmitted', () => {
    const event = new ExpenseSubmittedEvent('report-1', 'emp-1', 150, new Date('2026-08-01'));

    it('não deve criar item se o relatório não existir', async () => {
      mockExpenseReportRepo.findOne.mockResolvedValue(null);

      await service.handleExpenseSubmitted(event);

      expect(mockWorkflowItemRepo.save).not.toHaveBeenCalled();
    });

    it('não deve criar item se o colaborador não tiver manager', async () => {
      mockExpenseReportRepo.findOne.mockResolvedValue({
        id: 'report-1',
        employee: { managerId: null },
      });

      await service.handleExpenseSubmitted(event);

      expect(mockWorkflowItemRepo.save).not.toHaveBeenCalled();
    });

    it('não deve duplicar item se já existir um pendente para a mesma referência', async () => {
      mockExpenseReportRepo.findOne.mockResolvedValue({
        id: 'report-1',
        employee: { managerId: 'manager-1' },
      });
      mockWorkflowItemRepo.findOne.mockResolvedValue({ id: 'existing-wf' });

      await service.handleExpenseSubmitted(event);

      expect(mockWorkflowItemRepo.save).not.toHaveBeenCalled();
    });

    it('deve criar item de workflow para o manager do colaborador', async () => {
      mockExpenseReportRepo.findOne.mockResolvedValue({
        id: 'report-1',
        employee: { managerId: 'manager-1' },
      });
      mockWorkflowItemRepo.findOne.mockResolvedValue(null);
      mockWorkflowItemRepo.create.mockImplementation((data: Record<string, unknown>) => data);
      mockWorkflowItemRepo.save.mockResolvedValue({});

      await service.handleExpenseSubmitted(event);

      expect(mockWorkflowItemRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: WorkflowItemType.EXPENSE,
          referenceId: 'report-1',
          referenceType: 'ExpenseReport',
          requesterId: 'emp-1',
          assigneeId: 'manager-1',
          status: WorkflowItemStatus.PENDING,
        }),
      );
      expect(mockWorkflowItemRepo.save).toHaveBeenCalled();
    });
  });
});
