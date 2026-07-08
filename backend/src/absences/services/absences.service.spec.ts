import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AbsencesService } from './absences.service';
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
      ],
    }).compile();

    service = module.get<AbsencesService>(AbsencesService);
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
});
