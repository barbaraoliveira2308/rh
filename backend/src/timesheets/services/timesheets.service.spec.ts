import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TimesheetsService } from './timesheets.service';
import { TimesheetPeriod } from '../entities/timesheet-period.entity';
import { TimesheetEntry } from '../entities/timesheet-entry.entity';
import { TimesheetApproval } from '../entities/timesheet-approval.entity';
import { HolidayCalendar } from '../entities/holiday-calendar.entity';
import { AbsenceRequest, AbsenceStatus } from '../entities/absence-request.entity';
import { TimesheetStatus } from '../entities/timesheet-status.enum';
import { EntryType } from '../entities/entry-type.enum';
import { Employee, EmployeeStatus } from '../../users/entities/employee.entity';

describe('TimesheetsService', () => {
  let service: TimesheetsService;
  let mockPeriodRepo: Record<string, jest.Mock>;
  let mockEntryRepo: Record<string, jest.Mock>;
  let mockApprovalRepo: Record<string, jest.Mock>;
  let mockHolidayRepo: Record<string, jest.Mock>;
  let mockAbsenceRepo: Record<string, jest.Mock>;
  let mockEmployeeRepo: Record<string, jest.Mock>;
  let mockEventEmitter: Record<string, jest.Mock>;

  const mockEmployee = {
    id: 'emp-1',
    userId: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    status: EmployeeStatus.ACTIVE,
    managerId: 'manager-1',
  };

  const mockPeriod = {
    id: 'period-1',
    employeeId: 'emp-1',
    periodYear: 2026,
    periodMonth: 7,
    status: TimesheetStatus.IN_PROGRESS,
    entries: [],
    totalPlannedHours: 0,
    totalWorkedHours: 0,
    totalOvertimeHours: 0,
    hoursBalance: 0,
  };

  const mockEntries = [
    {
      id: 'entry-1',
      timesheetId: 'period-1',
      entryDate: '2026-07-01',
      plannedHours: 8,
      workedHours: 0,
      overtimeHours: 0,
      entryType: EntryType.WORK,
      isLocked: false,
    },
    {
      id: 'entry-2',
      timesheetId: 'period-1',
      entryDate: '2026-07-02',
      plannedHours: 8,
      workedHours: 0,
      overtimeHours: 0,
      entryType: EntryType.WORK,
      isLocked: false,
    },
  ];

  beforeEach(async () => {
    mockPeriodRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    mockEntryRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    mockApprovalRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    mockHolidayRepo = {
      find: jest.fn(),
    };

    mockAbsenceRepo = {
      find: jest.fn(),
    };

    mockEmployeeRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimesheetsService,
        { provide: getRepositoryToken(TimesheetPeriod), useValue: mockPeriodRepo },
        { provide: getRepositoryToken(TimesheetEntry), useValue: mockEntryRepo },
        { provide: getRepositoryToken(TimesheetApproval), useValue: mockApprovalRepo },
        { provide: getRepositoryToken(HolidayCalendar), useValue: mockHolidayRepo },
        { provide: getRepositoryToken(AbsenceRequest), useValue: mockAbsenceRepo },
        { provide: getRepositoryToken(Employee), useValue: mockEmployeeRepo },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<TimesheetsService>(TimesheetsService);
  });

  describe('syncAbsences', () => {
    it('deve lançar erro se período não existir', async () => {
      mockPeriodRepo.findOne.mockResolvedValue(null);

      await expect(service.syncAbsences('invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('deve sincronizar ausências aprovadas como entradas', async () => {
      mockPeriodRepo.findOne.mockResolvedValue(mockPeriod);

      const approvedAbsences = [
        {
          id: 'abs-1',
          employeeId: 'emp-1',
          startDate: '2026-07-03',
          endDate: '2026-07-03',
          type: 'sick',
          status: AbsenceStatus.APPROVED,
          hours: 8,
        },
      ];

      mockAbsenceRepo.find.mockResolvedValue(approvedAbsences);
      mockEntryRepo.findOne.mockResolvedValue(null);
      mockEntryRepo.create.mockReturnValue({});
      mockEntryRepo.save.mockResolvedValue({});
      mockEntryRepo.find.mockResolvedValue(mockEntries);
      mockPeriodRepo.update.mockResolvedValue(undefined);

      const count = await service.syncAbsences('period-1');

      expect(count).toBe(1);
      expect(mockEntryRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timesheetId: 'period-1',
          entryDate: '2026-07-03',
          entryType: EntryType.ABSENCE,
        }),
      );
    });

    it('deve atualizar entrada existente se não estiver locked', async () => {
      mockPeriodRepo.findOne.mockResolvedValue(mockPeriod);

      const approvedAbsences = [
        {
          id: 'abs-2',
          employeeId: 'emp-1',
          startDate: '2026-07-01',
          endDate: '2026-07-01',
          type: 'vacation',
          status: AbsenceStatus.APPROVED,
          hours: 8,
        },
      ];

      mockAbsenceRepo.find.mockResolvedValue(approvedAbsences);
      mockEntryRepo.findOne.mockResolvedValue({
        id: 'entry-1',
        timesheetId: 'period-1',
        entryDate: '2026-07-01',
        entryType: EntryType.WORK,
        workedHours: 0,
        isLocked: false,
      });

      mockEntryRepo.find.mockResolvedValue(mockEntries);
      mockPeriodRepo.update.mockResolvedValue(undefined);
      mockEntryRepo.update.mockResolvedValue(undefined);

      const count = await service.syncAbsences('period-1');

      expect(count).toBe(1);
      expect(mockEntryRepo.update).toHaveBeenCalledWith('entry-1', {
        entryType: EntryType.ABSENCE,
        workedHours: 8,
      });
    });
  });

  describe('bulkApprove', () => {
    it('deve aprovar múltiplas folhas de horas', async () => {
      const approver = { ...mockEmployee, id: 'admin-1', userId: 'admin' };

      mockEmployeeRepo.findOne.mockResolvedValue(approver);

      const submittedPeriod1 = {
        ...mockPeriod,
        id: 'period-1',
        status: TimesheetStatus.SUBMITTED,
        entries: mockEntries,
      };
      const submittedPeriod2 = {
        ...mockPeriod,
        id: 'period-2',
        status: TimesheetStatus.SUBMITTED,
        entries: mockEntries,
      };

      mockPeriodRepo.findOne
        .mockResolvedValueOnce(submittedPeriod1)
        .mockResolvedValueOnce(submittedPeriod2);

      mockPeriodRepo.save.mockResolvedValue({
        ...submittedPeriod1,
        status: TimesheetStatus.APPROVED,
      });

      mockApprovalRepo.create.mockReturnValue({});
      mockApprovalRepo.save.mockResolvedValue({});

      mockEntryRepo.find.mockResolvedValue(mockEntries);
      mockEntryRepo.update.mockResolvedValue(undefined);

      const results = await service.bulkApprove(['period-1', 'period-2'], 'admin-1');

      expect(results).toHaveLength(2);
      expect(mockEventEmitter.emit).toHaveBeenCalledTimes(2);
    });

    it('deve continuar mesmo se uma aprovação falhar', async () => {
      const approver = { ...mockEmployee, id: 'admin-1', userId: 'admin' };

      mockEmployeeRepo.findOne.mockResolvedValue(approver);

      const submittedPeriod = {
        ...mockPeriod,
        id: 'period-1',
        status: TimesheetStatus.SUBMITTED,
        entries: mockEntries,
      };

      mockPeriodRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(submittedPeriod);

      mockPeriodRepo.save.mockResolvedValue({
        ...submittedPeriod,
        status: TimesheetStatus.APPROVED,
      });

      mockApprovalRepo.create.mockReturnValue({});
      mockApprovalRepo.save.mockResolvedValue({});

      mockEntryRepo.find.mockResolvedValue(mockEntries);
      mockEntryRepo.update.mockResolvedValue(undefined);

      const results = await service.bulkApprove(['invalid-id', 'period-1'], 'admin-1');

      expect(results).toHaveLength(1);
    });
  });
});
