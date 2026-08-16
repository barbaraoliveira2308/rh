import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getEntityManagerToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TimesheetsService } from './timesheets.service';
import { CalendarService } from '../../calendar/services/calendar.service';
import { RbacService } from '../../rbac/services/rbac.service';
import { AdminService } from '../../admin/admin.service';
import { TimesheetPeriod } from '../entities/timesheet-period.entity';
import { TimesheetEntry } from '../entities/timesheet-entry.entity';
import { TimesheetApproval } from '../entities/timesheet-approval.entity';
import { TimesheetStatus } from '../entities/timesheet-status.enum';
import { EntryType } from '../entities/entry-type.enum';
import { Employee, EmployeeStatus } from '../../users/entities/employee.entity';
import { AbsenceApprovedEvent } from '../../absences/events/absence-approved.event';

describe('TimesheetsService', () => {
  let service: TimesheetsService;
  let mockPeriodRepo: Record<string, jest.Mock>;
  let mockEntryRepo: Record<string, jest.Mock>;
  let mockApprovalRepo: Record<string, jest.Mock>;
  let mockEntityManager: Record<string, jest.Mock>;
  let mockEmployeeRepo: Record<string, jest.Mock>;
  let mockEventEmitter: Record<string, jest.Mock>;
  let mockCalendarService: Record<string, jest.Mock>;
  let mockRbacService: Record<string, jest.Mock>;
  let mockAdminService: Record<string, jest.Mock>;

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

    mockEntityManager = {
      query: jest.fn(),
    };

    mockEmployeeRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    mockEventEmitter = {
      emit: jest.fn(),
    };

    mockCalendarService = {
      validateBlockedPeriodForTimesheets: jest.fn().mockResolvedValue(undefined),
      findHolidays: jest.fn().mockResolvedValue([]),
    };

    mockRbacService = {
      isAdmin: jest.fn().mockResolvedValue(false),
    };

    mockAdminService = {
      getSettings: jest.fn().mockResolvedValue({ defaultDailyHours: 8 }),
      getEffectiveCountryCode: jest.fn().mockResolvedValue('PT'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimesheetsService,
        { provide: getRepositoryToken(TimesheetPeriod), useValue: mockPeriodRepo },
        { provide: getRepositoryToken(TimesheetEntry), useValue: mockEntryRepo },
        { provide: getRepositoryToken(TimesheetApproval), useValue: mockApprovalRepo },
        { provide: getEntityManagerToken(), useValue: mockEntityManager },
        { provide: getRepositoryToken(Employee), useValue: mockEmployeeRepo },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: CalendarService, useValue: mockCalendarService },
        { provide: RbacService, useValue: mockRbacService },
        { provide: AdminService, useValue: mockAdminService },
      ],
    }).compile();

    service = module.get<TimesheetsService>(TimesheetsService);
  });

  describe('generateMonthlyPeriods', () => {
    it('deve usar defaultDailyHours de SystemSetting nas entradas de dias úteis', async () => {
      mockEmployeeRepo.find.mockResolvedValue([mockEmployee]);
      mockPeriodRepo.findOne.mockResolvedValue(null);
      mockPeriodRepo.create.mockImplementation((data: unknown) => data);
      mockPeriodRepo.save.mockResolvedValue({ id: 'period-new' });
      mockEntryRepo.create.mockImplementation((data: unknown) => data);
      mockEntryRepo.save.mockResolvedValue(undefined);
      mockEntryRepo.find.mockResolvedValue([]);
      mockAdminService.getSettings.mockResolvedValue({ defaultDailyHours: 7.5 });

      await service.generateMonthlyPeriods(2026, 8);

      expect(mockAdminService.getSettings).toHaveBeenCalled();
      const savedEntries = (mockEntryRepo.save.mock.calls[0] as unknown[])[0] as {
        entryType: EntryType;
        plannedHours: number;
      }[];
      const workEntry = savedEntries.find((entry) => entry.entryType === EntryType.WORK);
      expect(workEntry?.plannedHours).toBe(7.5);
    });

    it('deve marcar EntryType.HOLIDAY nos feriados do país da entidade legal do colaborador (ligação a Calendar)', async () => {
      mockEmployeeRepo.find.mockResolvedValue([mockEmployee]);
      mockPeriodRepo.findOne.mockResolvedValue(null);
      mockPeriodRepo.create.mockImplementation((data: unknown) => data);
      mockPeriodRepo.save.mockResolvedValue({ id: 'period-new' });
      mockEntryRepo.create.mockImplementation((data: unknown) => data);
      mockEntryRepo.save.mockResolvedValue(undefined);
      mockEntryRepo.find.mockResolvedValue([]);
      mockAdminService.getEffectiveCountryCode.mockResolvedValue('US');
      mockCalendarService.findHolidays.mockResolvedValue([
        { holidayDate: '2026-08-04', countryCode: 'US' },
      ]);

      await service.generateMonthlyPeriods(2026, 8);

      expect(mockAdminService.getEffectiveCountryCode).toHaveBeenCalledWith('emp-1');
      expect(mockCalendarService.findHolidays).toHaveBeenCalledWith(2026, 'US');
      const savedEntries = (mockEntryRepo.save.mock.calls[0] as unknown[])[0] as {
        entryDate: string;
        entryType: EntryType;
        plannedHours: number;
      }[];
      const holidayEntry = savedEntries.find((entry) => entry.entryDate === '2026-08-04');
      expect(holidayEntry?.entryType).toBe(EntryType.HOLIDAY);
      expect(holidayEntry?.plannedHours).toBe(0);
    });
  });

  describe('alertPendingSubmissions', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('não emite alerta se o prazo de submissão (timesheetSubmissionDeadlineDay) ainda não passou', async () => {
      jest.useFakeTimers().setSystemTime(new Date(2026, 7, 5));
      mockAdminService.getSettings.mockResolvedValue({ timesheetSubmissionDeadlineDay: 5 });
      mockPeriodRepo.find.mockResolvedValue([mockPeriod]);

      await service.alertPendingSubmissions();

      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('emite timesheet.pending-submission depois de ultrapassado o prazo', async () => {
      jest.useFakeTimers().setSystemTime(new Date(2026, 7, 6));
      mockAdminService.getSettings.mockResolvedValue({ timesheetSubmissionDeadlineDay: 5 });
      mockPeriodRepo.find.mockResolvedValue([mockPeriod]);

      await service.alertPendingSubmissions();

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('timesheet.pending-submission', {
        periodId: mockPeriod.id,
        employeeId: mockPeriod.employeeId,
      });
    });
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
          employee_id: 'emp-1',
          start_date: '2026-07-03',
          end_date: '2026-07-03',
          type: 'sick',
          status: 'approved',
          hours: 8,
        },
      ];

      mockEntityManager.query.mockResolvedValue(approvedAbsences);
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
          employee_id: 'emp-1',
          start_date: '2026-07-01',
          end_date: '2026-07-01',
          type: 'vacation',
          status: 'approved',
          total_hours: 8,
        },
      ];

      mockEntityManager.query.mockResolvedValue(approvedAbsences);
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

  describe('handleAbsenceApproved', () => {
    it('não faz nada se a ausência não for encontrada', async () => {
      mockEntityManager.query.mockResolvedValue([]);
      const syncSpy = jest.spyOn(service, 'syncAbsences');

      await service.handleAbsenceApproved(new AbsenceApprovedEvent('abs-1', 'emp-1', 'admin-1'));

      expect(syncSpy).not.toHaveBeenCalled();
    });

    it('sincroniza o período correspondente ao mês da ausência', async () => {
      mockEntityManager.query.mockResolvedValue([
        { start_date: '2026-04-15', end_date: '2026-04-17' },
      ]);
      mockPeriodRepo.findOne.mockResolvedValue(mockPeriod);
      const syncSpy = jest.spyOn(service, 'syncAbsences').mockResolvedValue(2);

      await service.handleAbsenceApproved(new AbsenceApprovedEvent('abs-1', 'emp-1', 'admin-1'));

      expect(mockPeriodRepo.findOne).toHaveBeenCalledWith({
        where: { employeeId: 'emp-1', periodYear: 2026, periodMonth: 4 },
      });
      expect(syncSpy).toHaveBeenCalledWith('period-1');
    });

    it('não chama syncAbsences quando não existe período para o mês da ausência', async () => {
      mockEntityManager.query.mockResolvedValue([
        { start_date: '2026-04-15', end_date: '2026-04-17' },
      ]);
      mockPeriodRepo.findOne.mockResolvedValue(null);
      const syncSpy = jest.spyOn(service, 'syncAbsences');

      await service.handleAbsenceApproved(new AbsenceApprovedEvent('abs-1', 'emp-1', 'admin-1'));

      expect(syncSpy).not.toHaveBeenCalled();
    });

    it('sincroniza os dois períodos quando a ausência atravessa a fronteira do mês', async () => {
      mockEntityManager.query.mockResolvedValue([
        { start_date: '2026-01-30', end_date: '2026-02-02' },
      ]);
      mockPeriodRepo.findOne.mockResolvedValue(mockPeriod);
      const syncSpy = jest.spyOn(service, 'syncAbsences').mockResolvedValue(1);

      await service.handleAbsenceApproved(new AbsenceApprovedEvent('abs-1', 'emp-1', 'admin-1'));

      expect(mockPeriodRepo.findOne).toHaveBeenCalledTimes(2);
      expect(syncSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('bulkApprove', () => {
    it('deve aprovar múltiplas folhas de horas', async () => {
      const approver = { ...mockEmployee, id: 'admin-1', userId: 'admin-user-uuid' };

      mockEmployeeRepo.findOne.mockResolvedValue(approver);
      mockRbacService.isAdmin.mockResolvedValue(true);

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
      const approver = { ...mockEmployee, id: 'admin-1', userId: 'admin-user-uuid' };

      mockEmployeeRepo.findOne.mockResolvedValue(approver);
      mockRbacService.isAdmin.mockResolvedValue(true);

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
