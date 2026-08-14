import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AbsencesService } from './absences.service';
import { CalendarService } from '../../calendar/services/calendar.service';
import { AbsenceType } from '../entities/absence-type.entity';
import { AbsenceRequest } from '../entities/absence-request.entity';
import { AbsenceApproval } from '../entities/absence-approval.entity';
import { LeaveBalance } from '../entities/leave-balance.entity';
import { AbsenceStatus } from '../entities/absence-status.enum';
import { Employee, EmployeeStatus } from '../../users/entities/employee.entity';
import { HolidayCalendar } from '../../timesheets/entities/holiday-calendar.entity';

describe('AbsencesService', () => {
  let service: AbsencesService;
  let mockTypeRepo: Record<string, jest.Mock>;
  let mockRequestRepo: Record<string, jest.Mock>;
  let mockApprovalRepo: Record<string, jest.Mock>;
  let mockBalanceRepo: Record<string, jest.Mock>;
  let mockEmployeeRepo: Record<string, jest.Mock>;
  let mockHolidayRepo: Record<string, jest.Mock>;
  let mockEventEmitter: Record<string, jest.Mock>;
  let mockCalendarService: Record<string, jest.Mock>;

  const mockEmployee = {
    id: 'emp-1',
    userId: 'user-1',
    firstName: 'João',
    lastName: 'Silva',
    email: 'joao@example.com',
    status: EmployeeStatus.ACTIVE,
    managerId: 'manager-1',
  };

  const mockVacationType = {
    id: 'type-1',
    name: 'Férias',
    code: 'VACATION',
    unit: 'days',
    limitPerYear: 22,
    requiresDocument: false,
    isPaid: true,
    affectsBalance: true,
    color: '#00FF00',
    isSystem: false,
    isActive: true,
    blockedPeriods: null,
  } as AbsenceType;

  const mockSickType = {
    id: 'type-2',
    name: 'Doença',
    code: 'SICK',
    unit: 'days',
    limitPerYear: null,
    requiresDocument: true,
    isPaid: true,
    affectsBalance: false,
    color: '#FF0000',
    isSystem: false,
    isActive: true,
    blockedPeriods: null,
  } as AbsenceType;

  const mockBalance = {
    id: 'bal-1',
    employeeId: 'emp-1',
    absenceTypeId: 'type-1',
    year: 2026,
    entitledDays: 22,
    usedDays: 5,
    pendingDays: 2,
    remainingDays: 17,
    carryOverDays: 0,
    employee: {} as Employee,
    absenceType: {} as AbsenceType,
  };

  beforeEach(async () => {
    mockTypeRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    mockRequestRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    mockApprovalRepo = {
      create: jest.fn(),
      save: jest.fn(),
    };

    mockBalanceRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
    };

    mockEmployeeRepo = {
      findOne: jest.fn(),
    };

    mockHolidayRepo = {
      find: jest.fn(),
    };

    mockEventEmitter = {
      emit: jest.fn(),
    };

    mockCalendarService = {
      validateBlockedPeriodForAbsences: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AbsencesService,
        { provide: getRepositoryToken(AbsenceType), useValue: mockTypeRepo },
        { provide: getRepositoryToken(AbsenceRequest), useValue: mockRequestRepo },
        { provide: getRepositoryToken(AbsenceApproval), useValue: mockApprovalRepo },
        { provide: getRepositoryToken(LeaveBalance), useValue: mockBalanceRepo },
        { provide: getRepositoryToken(Employee), useValue: mockEmployeeRepo },
        { provide: getRepositoryToken(HolidayCalendar), useValue: mockHolidayRepo },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: CalendarService, useValue: mockCalendarService },
      ],
    }).compile();

    service = module.get<AbsencesService>(AbsencesService);
  });

  describe('findTypes', () => {
    it('deve devolver apenas tipos de ausência ativos, ordenados por nome', async () => {
      mockTypeRepo.find.mockResolvedValue([mockSickType, mockVacationType]);

      const result = await service.findTypes();

      expect(mockTypeRepo.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { name: 'ASC' },
      });
      expect(result).toEqual([mockSickType, mockVacationType]);
    });
  });

  describe('create', () => {
    const validDto = {
      absenceTypeId: 'type-1',
      startDate: '2026-07-01',
      endDate: '2026-07-03',
      reason: 'Férias',
      startHalf: false,
      endHalf: false,
    };

    it('deve lançar erro se colaborador não existir', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue(null);

      await expect(service.create(validDto, 'emp-1')).rejects.toThrow(NotFoundException);
      expect(mockRequestRepo.save).not.toHaveBeenCalled();
    });

    it('deve lançar erro se colaborador estiver inativo', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue({
        ...mockEmployee,
        status: EmployeeStatus.INACTIVE,
      });
      mockTypeRepo.findOne.mockResolvedValue(mockVacationType);

      await expect(service.create(validDto, 'emp-1')).rejects.toThrow(BadRequestException);
      expect(mockRequestRepo.save).not.toHaveBeenCalled();
    });

    it('deve lançar erro se tipo de ausência não existir', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue(mockEmployee);
      mockTypeRepo.findOne.mockResolvedValue(null);

      await expect(service.create(validDto, 'emp-1')).rejects.toThrow(NotFoundException);
      expect(mockRequestRepo.save).not.toHaveBeenCalled();
    });

    it('deve lançar erro se tipo de ausência exigir documento', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue(mockEmployee);
      mockTypeRepo.findOne.mockResolvedValue(mockSickType);

      await expect(
        service.create({ ...validDto, absenceTypeId: 'type-2' }, 'emp-1'),
      ).rejects.toThrow(BadRequestException);
      expect(mockRequestRepo.save).not.toHaveBeenCalled();
    });

    it('deve lançar erro se data de fim for anterior à data de início', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue(mockEmployee);
      mockTypeRepo.findOne.mockResolvedValue(mockVacationType);

      await expect(
        service.create({ ...validDto, startDate: '2026-07-05', endDate: '2026-07-03' }, 'emp-1'),
      ).rejects.toThrow(BadRequestException);
      expect(mockRequestRepo.save).not.toHaveBeenCalled();
    });

    it('deve lançar erro se houver pedido pendente sobreposto', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue(mockEmployee);
      mockTypeRepo.findOne.mockResolvedValue(mockVacationType);
      mockHolidayRepo.find.mockResolvedValue([]);
      mockRequestRepo.findOne.mockResolvedValueOnce({
        id: 'existing-1',
        employeeId: 'emp-1',
        status: AbsenceStatus.PENDING,
      });

      await expect(service.create(validDto, 'emp-1')).rejects.toThrow(BadRequestException);
      expect(mockRequestRepo.save).not.toHaveBeenCalled();
    });

    it('deve lançar erro se houver ausência aprovada sobreposta', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue(mockEmployee);
      mockTypeRepo.findOne.mockResolvedValue(mockVacationType);
      mockHolidayRepo.find.mockResolvedValue([]);
      mockRequestRepo.findOne
        .mockResolvedValueOnce(null) // no overlapping pending
        .mockResolvedValueOnce({
          id: 'approved-1',
          employeeId: 'emp-1',
          status: AbsenceStatus.APPROVED,
        });

      await expect(service.create(validDto, 'emp-1')).rejects.toThrow(BadRequestException);
      expect(mockRequestRepo.save).not.toHaveBeenCalled();
    });

    it('deve lançar erro se saldo for insuficiente', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue(mockEmployee);
      mockTypeRepo.findOne.mockResolvedValue(mockVacationType);
      mockHolidayRepo.find.mockResolvedValue([]);
      mockRequestRepo.findOne
        .mockResolvedValueOnce(null) // no overlapping pending
        .mockResolvedValueOnce(null); // no overlapping approved
      mockBalanceRepo.findOne.mockResolvedValue(
        Object.assign({}, mockBalance, { remainingDays: 1, pendingDays: 0 }),
      );

      await expect(service.create(validDto, 'emp-1')).rejects.toThrow(BadRequestException);
      expect(mockRequestRepo.save).not.toHaveBeenCalled();
    });

    it('deve criar pedido com sucesso quando não afeta saldo', async () => {
      const noBalanceType = Object.assign({}, mockVacationType, {
        id: 'type-3',
        name: 'Dia Especial',
        code: 'SPECIAL',
        affectsBalance: false,
      });

      mockEmployeeRepo.findOne.mockResolvedValue(mockEmployee);
      mockTypeRepo.findOne.mockResolvedValue(noBalanceType);
      mockHolidayRepo.find.mockResolvedValue([]);
      mockRequestRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

      const createdRequest = {
        id: 'req-1',
        employeeId: 'emp-1',
        absenceTypeId: 'type-3',
        startDate: '2026-07-01',
        endDate: '2026-07-03',
        startHalf: false,
        endHalf: false,
        totalDays: 3,
        totalHours: 24,
        status: AbsenceStatus.PENDING,
        reason: 'Férias',
        documentUrl: null,
      };

      mockRequestRepo.create.mockReturnValue(createdRequest);
      mockRequestRepo.save.mockResolvedValue(createdRequest);

      const result = await service.create({ ...validDto, absenceTypeId: 'type-3' }, 'emp-1');

      expect(result).toEqual(createdRequest);
      expect(mockRequestRepo.create).toHaveBeenCalled();
      expect(mockRequestRepo.save).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'absence.requested',
        expect.objectContaining({ absenceId: 'req-1' }),
      );
    });
  });

  describe('approve', () => {
    const mockManager = {
      id: 'manager-1',
      userId: 'manager-user',
      firstName: 'Manager',
      lastName: 'Test',
      email: 'manager@example.com',
      status: EmployeeStatus.ACTIVE,
      managerId: null,
    };

    let mockPendingRequest: Record<string, unknown>;

    beforeEach(() => {
      mockPendingRequest = {
        id: 'req-1',
        employeeId: 'emp-1',
        absenceTypeId: 'type-1',
        startDate: '2026-08-01',
        endDate: '2026-08-03',
        totalDays: 3,
        totalHours: 24,
        status: AbsenceStatus.PENDING,
        reason: 'Férias',
        rejectionReason: null,
        documentUrl: null,
        absenceType: mockVacationType,
      };
    });

    it('deve lançar erro se pedido não existir', async () => {
      mockRequestRepo.findOne.mockResolvedValue(null);

      await expect(service.approve('req-1', 'manager-1')).rejects.toThrow(NotFoundException);
    });

    it('deve lançar erro se pedido não estiver pendente', async () => {
      mockRequestRepo.findOne.mockResolvedValue({
        ...mockPendingRequest,
        status: AbsenceStatus.APPROVED,
      });

      await expect(service.approve('req-1', 'manager-1')).rejects.toThrow(BadRequestException);
    });

    it('deve lançar erro se aprovador não for o manager', async () => {
      mockRequestRepo.findOne.mockResolvedValue(mockPendingRequest);
      mockEmployeeRepo.findOne
        .mockResolvedValueOnce(mockManager)
        .mockResolvedValueOnce(mockEmployee);

      await expect(service.approve('req-1', 'wrong-approver')).rejects.toThrow(ForbiddenException);
    });

    it('deve aprovar com sucesso e atualizar saldo', async () => {
      const savedRequest = { ...mockPendingRequest, status: AbsenceStatus.APPROVED };
      const approval = {
        id: 'appr-1',
        absenceId: 'req-1',
        approverId: 'manager-1',
        decision: 'approved',
      };

      mockRequestRepo.findOne.mockResolvedValue(mockPendingRequest);
      mockEmployeeRepo.findOne
        .mockResolvedValueOnce(mockManager)
        .mockResolvedValueOnce(mockEmployee);
      mockRequestRepo.save.mockResolvedValue(savedRequest);
      mockApprovalRepo.create.mockReturnValue(approval);
      mockApprovalRepo.save.mockResolvedValue(approval);
      mockBalanceRepo.findOne.mockResolvedValue(mockBalance);

      const result = await service.approve('req-1', 'manager-1');

      expect(result).toEqual(savedRequest);
      expect(mockRequestRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: AbsenceStatus.APPROVED }),
      );
      expect(mockApprovalRepo.create).toHaveBeenCalledWith({
        absenceId: 'req-1',
        approverId: 'manager-1',
        decision: 'approved',
      });
      expect(mockBalanceRepo.update).toHaveBeenCalledWith('bal-1', {
        usedDays: 8,
        pendingDays: 0,
        remainingDays: 14,
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'absence.approved',
        expect.objectContaining({ absenceId: 'req-1' }),
      );
    });

    it('deve aprovar sem atualizar saldo se tipo não afetar saldo', async () => {
      const noBalanceType = Object.assign({}, mockVacationType, {
        affectsBalance: false,
      });
      const requestNoBalance = Object.assign({}, mockPendingRequest, {
        absenceType: noBalanceType,
      });
      const savedRequest = Object.assign({}, requestNoBalance, {
        status: AbsenceStatus.APPROVED,
      });
      const approval = {
        id: 'appr-2',
        absenceId: 'req-1',
        approverId: 'manager-1',
        decision: 'approved',
      };

      mockRequestRepo.findOne.mockResolvedValue(requestNoBalance);
      mockEmployeeRepo.findOne
        .mockResolvedValueOnce(mockManager)
        .mockResolvedValueOnce(mockEmployee);
      mockRequestRepo.save.mockResolvedValue(savedRequest);
      mockApprovalRepo.create.mockReturnValue(approval);
      mockApprovalRepo.save.mockResolvedValue(approval);

      const result = await service.approve('req-1', 'manager-1');

      expect(result).toEqual(savedRequest);
      expect(mockBalanceRepo.findOne).not.toHaveBeenCalled();
      expect(mockBalanceRepo.update).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'absence.approved',
        expect.objectContaining({ absenceId: 'req-1' }),
      );
    });
  });

  describe('reject', () => {
    const mockManager = {
      id: 'manager-1',
      userId: 'manager-user',
      firstName: 'Manager',
      lastName: 'Test',
      email: 'manager@example.com',
      status: EmployeeStatus.ACTIVE,
      managerId: null,
    };

    const mockPendingRequest = {
      id: 'req-1',
      employeeId: 'emp-1',
      absenceTypeId: 'type-1',
      startDate: '2026-08-01',
      endDate: '2026-08-03',
      totalDays: 3,
      totalHours: 24,
      status: AbsenceStatus.PENDING,
      reason: 'Férias',
      rejectionReason: null,
      documentUrl: null,
    };

    it('deve lançar erro se pedido não existir', async () => {
      mockRequestRepo.findOne.mockResolvedValue(null);

      await expect(service.reject('req-1', 'manager-1', 'Motivo')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar erro se pedido não estiver pendente', async () => {
      mockRequestRepo.findOne.mockResolvedValue({
        ...mockPendingRequest,
        status: AbsenceStatus.APPROVED,
      });

      await expect(service.reject('req-1', 'manager-1', 'Motivo')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar erro se aprovador não for o manager', async () => {
      mockRequestRepo.findOne.mockResolvedValue(mockPendingRequest);
      mockEmployeeRepo.findOne
        .mockResolvedValueOnce(mockManager)
        .mockResolvedValueOnce(mockEmployee);

      await expect(service.reject('req-1', 'wrong-approver', 'Motivo')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deve rejeitar com sucesso e atualizar pendingDays', async () => {
      const savedRequest = {
        ...mockPendingRequest,
        status: AbsenceStatus.REJECTED,
        rejectionReason: 'Motivo',
      };
      const approval = {
        id: 'appr-1',
        absenceId: 'req-1',
        approverId: 'manager-1',
        decision: 'rejected',
        comments: 'Motivo',
      };

      mockRequestRepo.findOne.mockResolvedValue(mockPendingRequest);
      mockEmployeeRepo.findOne
        .mockResolvedValueOnce(mockManager)
        .mockResolvedValueOnce(mockEmployee);
      mockBalanceRepo.findOne.mockResolvedValue(mockBalance);
      mockRequestRepo.save.mockResolvedValue(savedRequest);
      mockApprovalRepo.create.mockReturnValue(approval);
      mockApprovalRepo.save.mockResolvedValue(approval);

      const result = await service.reject('req-1', 'manager-1', 'Motivo');

      expect(result).toEqual(savedRequest);
      expect(mockRequestRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AbsenceStatus.REJECTED,
          rejectionReason: 'Motivo',
        }),
      );
      expect(mockBalanceRepo.update).toHaveBeenCalledWith('bal-1', {
        pendingDays: 0,
      });
      expect(mockApprovalRepo.create).toHaveBeenCalledWith({
        absenceId: 'req-1',
        approverId: 'manager-1',
        decision: 'rejected',
        comments: 'Motivo',
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'absence.rejected',
        expect.objectContaining({ absenceId: 'req-1' }),
      );
    });
  });

  describe('cancel', () => {
    const isoDaysFromNow = (days: number): string =>
      new Date(Date.now() + days * 24 * 3600 * 1000).toISOString().split('T')[0];

    const mockPendingRequest = {
      id: 'req-1',
      employeeId: 'emp-1',
      absenceTypeId: 'type-1',
      startDate: isoDaysFromNow(10),
      endDate: isoDaysFromNow(12),
      totalDays: 3,
      totalHours: 24,
      status: AbsenceStatus.PENDING,
      reason: 'Férias',
      rejectionReason: null,
      documentUrl: null,
    };

    const mockApprovedFutureRequest = Object.assign({}, mockPendingRequest, {
      status: AbsenceStatus.APPROVED,
    });

    const mockApprovedPastRequest = Object.assign({}, mockPendingRequest, {
      startDate: isoDaysFromNow(-10),
      endDate: isoDaysFromNow(-8),
      status: AbsenceStatus.APPROVED,
    });

    it('deve lançar erro se pedido não existir', async () => {
      mockRequestRepo.findOne.mockResolvedValue(null);

      await expect(service.cancel('req-1', 'emp-1')).rejects.toThrow(NotFoundException);
    });

    it('deve lançar erro se não for o próprio', async () => {
      mockRequestRepo.findOne.mockResolvedValue(mockPendingRequest);

      await expect(service.cancel('req-1', 'other-user')).rejects.toThrow(ForbiddenException);
    });

    it('deve lançar erro se aprovado e já começou', async () => {
      mockRequestRepo.findOne.mockResolvedValue(mockApprovedPastRequest);

      await expect(service.cancel('req-1', 'emp-1')).rejects.toThrow(BadRequestException);
    });

    it('deve lançar erro se já cancelado ou rejeitado', async () => {
      const mockCancelledRequest = Object.assign({}, mockPendingRequest, {
        status: AbsenceStatus.CANCELLED,
      });
      mockRequestRepo.findOne.mockResolvedValue(mockCancelledRequest);

      await expect(service.cancel('req-1', 'emp-1')).rejects.toThrow(BadRequestException);
    });

    it('deve cancelar pedido pendente e atualizar pendingDays', async () => {
      const savedRequest = Object.assign({}, mockPendingRequest, {
        status: AbsenceStatus.CANCELLED,
      });

      mockRequestRepo.findOne.mockResolvedValue(mockPendingRequest);
      mockBalanceRepo.findOne.mockResolvedValue(mockBalance);
      mockRequestRepo.save.mockResolvedValue(savedRequest);

      const result = await service.cancel('req-1', 'emp-1');

      expect(result).toEqual(savedRequest);
      expect(mockBalanceRepo.update).toHaveBeenCalledWith('bal-1', {
        pendingDays: 0,
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'absence.cancelled',
        expect.objectContaining({ absenceId: 'req-1' }),
      );
    });

    it('deve cancelar pedido aprovado futuro e restaurar saldo', async () => {
      const savedRequest = Object.assign({}, mockApprovedFutureRequest, {
        status: AbsenceStatus.CANCELLED,
      });

      mockRequestRepo.findOne.mockResolvedValue(mockApprovedFutureRequest);
      mockBalanceRepo.findOne.mockResolvedValue(mockBalance);
      mockRequestRepo.save.mockResolvedValue(savedRequest);

      const result = await service.cancel('req-1', 'emp-1');

      expect(result).toEqual(savedRequest);
      expect(mockBalanceRepo.update).toHaveBeenCalledWith('bal-1', {
        usedDays: 2,
        remainingDays: 20,
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'absence.cancelled',
        expect.objectContaining({ absenceId: 'req-1' }),
      );
    });
  });

  describe('getLeaveBalance', () => {
    it('deve retornar saldos do colaborador para o ano', async () => {
      const balances = [mockBalance];
      mockBalanceRepo.find.mockResolvedValue(balances);

      const result = await service.getLeaveBalance('emp-1', 2026);

      expect(result).toEqual(balances);
      expect(mockBalanceRepo.find).toHaveBeenCalledWith({
        where: { employeeId: 'emp-1', year: 2026 },
        relations: ['absenceType'],
        order: { absenceTypeId: 'ASC' },
      });
    });
  });
});
