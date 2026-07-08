import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
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
    it('deve retornar itens pendentes do utilizador', async () => {
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
  });

  describe('approve', () => {
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
  });

  describe('reject', () => {
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
  });
});
