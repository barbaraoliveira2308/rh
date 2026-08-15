import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ExpensesService } from './expenses.service';
import { RbacService } from '../../rbac/services/rbac.service';
import { AdminService } from '../../admin/admin.service';
import { ExpenseReport } from '../entities/expense-report.entity';
import { ExpenseItem } from '../entities/expense-item.entity';
import { ExpenseCategory } from '../entities/expense-category.entity';
import { ExpenseApproval } from '../entities/expense-approval.entity';
import { ExpenseReportStatus } from '../entities/expense-report-status.enum';
import { Employee } from '../../users/entities/employee.entity';

describe('ExpensesService', () => {
  let service: ExpensesService;
  let mockReportRepo: Record<string, jest.Mock>;
  let mockItemRepo: Record<string, jest.Mock>;
  let mockCategoryRepo: Record<string, jest.Mock>;
  let mockApprovalRepo: Record<string, jest.Mock>;
  let mockEmployeeRepo: Record<string, jest.Mock>;
  let mockEventEmitter: Record<string, jest.Mock>;
  let mockRbacService: Record<string, jest.Mock>;
  let mockAdminService: Record<string, jest.Mock>;

  const mockCategory: ExpenseCategory = {
    id: 'cat-1',
    name: 'Alimentação',
    code: 'MEALS',
    limitAmount: 50,
    requiresReceipt: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTransportCategory: ExpenseCategory = {
    id: 'cat-2',
    name: 'Transporte',
    code: 'TRANSPORT',
    limitAmount: 100,
    requiresReceipt: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
  const fortyDaysAgo = new Date();
  fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40);
  const fortyDaysAgoStr = fortyDaysAgo.toISOString().split('T')[0];

  const createMockReport = (
    id: string,
    employeeId: string,
    items: Partial<ExpenseItem>[],
  ): ExpenseReport => {
    const reportItems = items.map((item) =>
      Object.assign({}, item, {
        category: item.categoryId === 'cat-2' ? mockTransportCategory : mockCategory,
      }),
    ) as ExpenseItem[];

    return {
      id,
      employeeId,
      title: 'Relatório teste',
      periodStart: today,
      periodEnd: today,
      status: ExpenseReportStatus.PENDING,
      totalAmount: reportItems.reduce((sum, item) => sum + item.amount, 0),
      currency: 'EUR',
      projectId: null,
      notes: null,
      submittedAt: new Date(),
      approvedAt: null,
      approvedBy: null,
      rejectionReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: reportItems,
      employee: {} as Employee,
    };
  };

  beforeEach(async () => {
    mockReportRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    mockItemRepo = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    mockCategoryRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
    };

    mockApprovalRepo = {
      create: jest.fn(),
      save: jest.fn(),
    };

    mockEmployeeRepo = {
      findOne: jest.fn(),
    };

    mockEventEmitter = {
      emit: jest.fn(),
    };

    mockRbacService = {
      isAdmin: jest.fn().mockResolvedValue(false),
    };

    mockAdminService = {
      getSettings: jest.fn().mockResolvedValue({ defaultCurrency: 'EUR' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpensesService,
        { provide: getRepositoryToken(ExpenseReport), useValue: mockReportRepo },
        { provide: getRepositoryToken(ExpenseItem), useValue: mockItemRepo },
        { provide: getRepositoryToken(ExpenseCategory), useValue: mockCategoryRepo },
        { provide: getRepositoryToken(ExpenseApproval), useValue: mockApprovalRepo },
        { provide: getRepositoryToken(Employee), useValue: mockEmployeeRepo },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: RbacService, useValue: mockRbacService },
        { provide: AdminService, useValue: mockAdminService },
      ],
    }).compile();

    service = module.get<ExpensesService>(ExpensesService);
  });

  describe('detectDuplicates', () => {
    it('deve retornar lista vazia quando não existem relatórios', async () => {
      mockReportRepo.find.mockResolvedValue([]);

      const result = await service.detectDuplicates('emp-1', 50, today, 'cat-1');

      expect(result).toEqual([]);
    });

    it('deve detetar duplicado com mesmo valor, data e categoria', async () => {
      const mockReport = createMockReport('rep-1', 'emp-1', [
        {
          id: 'item-1',
          reportId: 'rep-1',
          categoryId: 'cat-1',
          description: 'Almoço',
          amount: 50,
          currency: 'EUR',
          expenseDate: today,
          receiptUrl: 'http://recibo.pt/1',
          isDuplicate: false,
        },
      ]);

      mockReportRepo.find.mockResolvedValue([mockReport]);

      const result = await service.detectDuplicates('emp-1', 50, today, 'cat-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('rep-1');
    });

    it('deve detetar duplicado com valor dentro da margem de 5%', async () => {
      const mockReport = createMockReport('rep-1', 'emp-1', [
        {
          id: 'item-1',
          reportId: 'rep-1',
          categoryId: 'cat-1',
          description: 'Almoço',
          amount: 52,
          currency: 'EUR',
          expenseDate: today,
          receiptUrl: 'http://recibo.pt/1',
          isDuplicate: false,
        },
      ]);

      mockReportRepo.find.mockResolvedValue([mockReport]);

      const result = await service.detectDuplicates('emp-1', 50, today, 'cat-1');

      expect(result).toHaveLength(1);
    });

    it('não deve detetar duplicado quando valor excede a margem de 5%', async () => {
      const mockReport = createMockReport('rep-1', 'emp-1', [
        {
          id: 'item-1',
          reportId: 'rep-1',
          categoryId: 'cat-1',
          description: 'Almoço',
          amount: 60,
          currency: 'EUR',
          expenseDate: today,
          receiptUrl: 'http://recibo.pt/1',
          isDuplicate: false,
        },
      ]);

      mockReportRepo.find.mockResolvedValue([mockReport]);

      const result = await service.detectDuplicates('emp-1', 50, today, 'cat-1');

      expect(result).toHaveLength(0);
    });

    it('não deve detetar duplicado quando a data está fora dos últimos 30 dias', async () => {
      const mockReport = createMockReport('rep-1', 'emp-1', [
        {
          id: 'item-1',
          reportId: 'rep-1',
          categoryId: 'cat-1',
          description: 'Almoço',
          amount: 50,
          currency: 'EUR',
          expenseDate: fortyDaysAgoStr,
          receiptUrl: 'http://recibo.pt/1',
          isDuplicate: false,
        },
      ]);

      mockReportRepo.find.mockResolvedValue([mockReport]);

      const result = await service.detectDuplicates('emp-1', 50, today, 'cat-1');

      expect(result).toHaveLength(0);
    });

    it('não deve detetar duplicado quando a categoria é diferente', async () => {
      const mockReport = createMockReport('rep-1', 'emp-1', [
        {
          id: 'item-1',
          reportId: 'rep-1',
          categoryId: 'cat-2',
          description: 'Taxi',
          amount: 50,
          currency: 'EUR',
          expenseDate: today,
          receiptUrl: null,
          isDuplicate: false,
        },
      ]);

      mockReportRepo.find.mockResolvedValue([mockReport]);

      const result = await service.detectDuplicates('emp-1', 50, today, 'cat-1');

      expect(result).toHaveLength(0);
    });

    it('deve excluir o próprio relatório quando excludeReportId é fornecido', async () => {
      const mockReport = createMockReport('rep-1', 'emp-1', [
        {
          id: 'item-1',
          reportId: 'rep-1',
          categoryId: 'cat-1',
          description: 'Almoço',
          amount: 50,
          currency: 'EUR',
          expenseDate: today,
          receiptUrl: 'http://recibo.pt/1',
          isDuplicate: false,
        },
      ]);

      mockReportRepo.find.mockResolvedValue([mockReport]);

      const result = await service.detectDuplicates('emp-1', 50, today, 'cat-1', 'rep-1');

      expect(result).toHaveLength(0);
    });

    it('deve detetar múltiplos duplicados no mesmo relatório', async () => {
      const mockReport = createMockReport('rep-1', 'emp-1', [
        {
          id: 'item-1',
          reportId: 'rep-1',
          categoryId: 'cat-1',
          description: 'Almoço',
          amount: 49,
          currency: 'EUR',
          expenseDate: today,
          receiptUrl: 'http://recibo.pt/1',
          isDuplicate: false,
        },
        {
          id: 'item-2',
          reportId: 'rep-1',
          categoryId: 'cat-1',
          description: 'Jantar',
          amount: 51,
          currency: 'EUR',
          expenseDate: today,
          receiptUrl: 'http://recibo.pt/2',
          isDuplicate: false,
        },
      ]);

      mockReportRepo.find.mockResolvedValue([mockReport]);

      const result = await service.detectDuplicates('emp-1', 50, today, 'cat-1');

      expect(result).toHaveLength(1);
    });

    it('não deve detetar duplicados de outros colaboradores', async () => {
      const mockReport = createMockReport('rep-1', 'emp-2', [
        {
          id: 'item-1',
          reportId: 'rep-1',
          categoryId: 'cat-1',
          description: 'Almoço',
          amount: 50,
          currency: 'EUR',
          expenseDate: today,
          receiptUrl: 'http://recibo.pt/1',
          isDuplicate: false,
        },
      ]);

      mockReportRepo.find.mockImplementation((options: { where: { employeeId: string } }) => {
        if (options.where.employeeId === 'emp-2') {
          return Promise.resolve([mockReport]);
        }
        return Promise.resolve([]);
      });

      const result = await service.detectDuplicates('emp-1', 50, today, 'cat-1');

      expect(result).toHaveLength(0);
    });

    it('deve detetar duplicado dentro da janela de 30 dias', async () => {
      const mockReport = createMockReport('rep-1', 'emp-1', [
        {
          id: 'item-1',
          reportId: 'rep-1',
          categoryId: 'cat-1',
          description: 'Almoço',
          amount: 50,
          currency: 'EUR',
          expenseDate: thirtyDaysAgoStr,
          receiptUrl: 'http://recibo.pt/1',
          isDuplicate: false,
        },
      ]);

      mockReportRepo.find.mockResolvedValue([mockReport]);

      const result = await service.detectDuplicates('emp-1', 50, today, 'cat-1');

      expect(result).toHaveLength(1);
    });
  });
});
