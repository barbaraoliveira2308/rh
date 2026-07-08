import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CalendarService } from './calendar.service';
import { PublicHoliday } from '../entities/public-holiday.entity';
import { CompanyEvent } from '../entities/company-event.entity';
import { BlockedPeriod, BlockedPeriodScope } from '../entities/blocked-period.entity';
import { Employee } from '../../users/entities/employee.entity';
import { AbsenceRequest } from '../../absences/entities/absence-request.entity';
import { TeamMember } from '../../teams/entities/team-member.entity';

describe('CalendarService', () => {
  let service: CalendarService;
  let mockHolidayRepo: Record<string, jest.Mock>;
  let mockEventRepo: Record<string, jest.Mock>;
  let mockBlockedRepo: Record<string, jest.Mock>;
  let mockEmployeeRepo: Record<string, jest.Mock>;
  let mockAbsenceRepo: Record<string, jest.Mock>;
  let mockTeamMemberRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockHolidayRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    mockEventRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockBlockedRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    mockEmployeeRepo = {
      find: jest.fn(),
    };

    mockAbsenceRepo = {
      find: jest.fn(),
    };

    mockTeamMemberRepo = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarService,
        { provide: getRepositoryToken(PublicHoliday), useValue: mockHolidayRepo },
        { provide: getRepositoryToken(CompanyEvent), useValue: mockEventRepo },
        { provide: getRepositoryToken(BlockedPeriod), useValue: mockBlockedRepo },
        { provide: getRepositoryToken(Employee), useValue: mockEmployeeRepo },
        { provide: getRepositoryToken(AbsenceRequest), useValue: mockAbsenceRepo },
        { provide: getRepositoryToken(TeamMember), useValue: mockTeamMemberRepo },
      ],
    }).compile();

    service = module.get<CalendarService>(CalendarService);
  });

  describe('isWorkingDay', () => {
    it('deve retornar false para fim de semana', async () => {
      const result = await service.isWorkingDay('2026-01-03');
      expect(result).toBe(false);
    });

    it('deve retornar false para feriado', async () => {
      mockHolidayRepo.findOne.mockResolvedValue({ id: '1', holidayDate: '2026-01-01' });
      const result = await service.isWorkingDay('2026-01-01');
      expect(result).toBe(false);
    });

    it('deve retornar true para dia útil sem feriado', async () => {
      mockHolidayRepo.findOne.mockResolvedValue(null);
      const result = await service.isWorkingDay('2026-01-02');
      expect(result).toBe(true);
    });
  });

  describe('getWorkingDaysInMonth', () => {
    it('deve contar apenas dias úteis de julho de 2026', async () => {
      mockHolidayRepo.findOne.mockResolvedValue(null);
      const result = await service.getWorkingDaysInMonth(2026, 7);
      expect(result).toBe(23);
    });
  });

  describe('createBlockedPeriod', () => {
    it('deve criar período bloqueado', async () => {
      const dto = {
        reason: 'Fecho anual',
        startDate: '2026-08-01',
        endDate: '2026-08-15',
        scope: BlockedPeriodScope.ALL,
      };

      const blocked = { id: 'bp-1', ...dto, createdBy: 'admin-1' };
      mockBlockedRepo.create.mockReturnValue(blocked);
      mockBlockedRepo.save.mockResolvedValue(blocked);

      const result = await service.createBlockedPeriod(dto, 'admin-1');
      expect(result.reason).toBe('Fecho anual');
      expect(mockBlockedRepo.save).toHaveBeenCalled();
    });

    it('deve rejeitar data de fim anterior à de início', async () => {
      const dto = {
        reason: 'Inválido',
        startDate: '2026-08-15',
        endDate: '2026-08-01',
        scope: BlockedPeriodScope.ALL,
      };

      await expect(service.createBlockedPeriod(dto, 'admin-1')).rejects.toThrow();
    });
  });

  describe('validateBlockedPeriodForAbsences', () => {
    it('deve lançar erro se período estiver bloqueado', async () => {
      mockBlockedRepo.findOne.mockResolvedValue({
        id: 'bp-1',
        startDate: '2026-08-01',
        endDate: '2026-08-15',
        scope: BlockedPeriodScope.ALL,
      });

      await expect(
        service.validateBlockedPeriodForAbsences('2026-08-05', '2026-08-10'),
      ).rejects.toThrow('Período bloqueado para ausências');
    });
  });

  describe('validateBlockedPeriodForTimesheets', () => {
    it('deve lançar erro se data estiver bloqueada', async () => {
      mockBlockedRepo.findOne.mockResolvedValue({
        id: 'bp-1',
        startDate: '2026-08-01',
        endDate: '2026-08-15',
        scope: BlockedPeriodScope.ALL,
      });

      await expect(service.validateBlockedPeriodForTimesheets('2026-08-05')).rejects.toThrow(
        'Período bloqueado para folhas de horas',
      );
    });
  });
});
