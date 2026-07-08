import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { PublicHoliday } from '../entities/public-holiday.entity';
import { CompanyEvent, CompanyEventType } from '../entities/company-event.entity';
import { BlockedPeriod, BlockedPeriodScope } from '../entities/blocked-period.entity';
import { Employee, EmployeeStatus } from '../../users/entities/employee.entity';
import { AbsenceRequest } from '../../absences/entities/absence-request.entity';
import { AbsenceStatus } from '../../absences/entities/absence-status.enum';
import { TeamMember } from '../../teams/entities/team-member.entity';
import { CreatePublicHolidayDto } from '../dto/create-public-holiday.dto';
import { CreateCompanyEventDto } from '../dto/create-company-event.dto';
import { CreateBlockedPeriodDto } from '../dto/create-blocked-period.dto';

interface NagerHolidayDto {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  counties: string[] | null;
  launchYear: number | null;
  types: string[];
}

export interface CalendarEvent {
  id: string;
  type: string;
  title: string;
  date: string;
  endDate?: string | null;
  color?: string | null;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(PublicHoliday)
    private readonly holidayRepository: Repository<PublicHoliday>,
    @InjectRepository(CompanyEvent)
    private readonly eventRepository: Repository<CompanyEvent>,
    @InjectRepository(BlockedPeriod)
    private readonly blockedPeriodRepository: Repository<BlockedPeriod>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(AbsenceRequest)
    private readonly absenceRepository: Repository<AbsenceRequest>,
    @InjectRepository(TeamMember)
    private readonly teamMemberRepository: Repository<TeamMember>,
  ) {}

  @Cron('0 6 1 1 *')
  async importCurrentYearHolidays(): Promise<number> {
    const year = new Date().getFullYear();
    return this.importPortugalHolidays(year);
  }

  async importPortugalHolidays(year: number): Promise<number> {
    const response = await fetch(
      'https://date.nager.at/api/v3/PublicHolidays/' + String(year) + '/PT',
    );

    if (!response.ok) {
      throw new BadRequestException('Falha ao importar feriados de Portugal');
    }

    const holidays = (await response.json()) as NagerHolidayDto[];
    let importedCount = 0;

    for (const holiday of holidays) {
      const existing = await this.holidayRepository.findOne({
        where: { countryCode: 'PT', holidayDate: holiday.date },
      });

      if (existing) continue;

      const entity = this.holidayRepository.create({
        countryCode: 'PT',
        holidayDate: holiday.date,
        name: holiday.name,
        localName: holiday.localName,
        global: holiday.global,
        region: holiday.counties ? holiday.counties.join(', ') : null,
        type: holiday.types.join(', '),
      });

      await this.holidayRepository.save(entity);
      importedCount++;
    }

    return importedCount;
  }

  async findHolidays(year?: number, countryCode = 'PT'): Promise<PublicHoliday[]> {
    const where: Record<string, unknown> = { countryCode };

    if (year) {
      where.holidayDate = Between(String(year) + '-01-01', String(year) + '-12-31');
    }

    return this.holidayRepository.find({ where, order: { holidayDate: 'ASC' } });
  }

  async createHoliday(dto: CreatePublicHolidayDto): Promise<PublicHoliday> {
    const entity = this.holidayRepository.create({
      countryCode: dto.countryCode,
      holidayDate: dto.holidayDate,
      name: dto.name,
      localName: dto.localName ?? null,
      global: dto.global ?? false,
      region: dto.region ?? null,
      type: dto.type ?? null,
    });

    return this.holidayRepository.save(entity);
  }

  async getMonthView(year: number, month: number, teamId?: string): Promise<CalendarEvent[]> {
    const events: CalendarEvent[] = [];
    const monthStart = String(year) + '-' + String(month).padStart(2, '0') + '-01';
    const lastDay = new Date(year, month, 0).getDate();
    const monthEnd =
      String(year) + '-' + String(month).padStart(2, '0') + '-' + String(lastDay).padStart(2, '0');

    const holidays = await this.holidayRepository.find({
      where: { holidayDate: Between(monthStart, monthEnd) },
    });

    for (const holiday of holidays) {
      events.push({
        id: holiday.id,
        type: 'holiday',
        title: holiday.name,
        date: holiday.holidayDate,
        color: '#9CA3AF',
        metadata: { countryCode: holiday.countryCode, global: holiday.global },
      });
    }

    const companyEvents = await this.eventRepository.find({
      where: [
        { startDate: Between(monthStart, monthEnd) },
        { endDate: Between(monthStart, monthEnd) },
        { startDate: LessThanOrEqual(monthStart), endDate: MoreThanOrEqual(monthEnd) },
      ],
    });

    for (const companyEvent of companyEvents) {
      events.push({
        id: companyEvent.id,
        type: 'company-event',
        title: companyEvent.title,
        date: companyEvent.startDate,
        endDate: companyEvent.endDate,
        color: companyEvent.color ?? '#8B5CF6',
        metadata: { eventType: companyEvent.type },
      });
    }

    if (teamId) {
      const members = await this.teamMemberRepository.find({
        where: { teamId },
        select: ['employeeId'],
      });

      const employeeIds = members.map((m) => m.employeeId);

      if (employeeIds.length > 0) {
        const absences = await this.absenceRepository.find({
          where: {
            status: AbsenceStatus.APPROVED,
            employeeId: In(employeeIds),
            startDate: LessThanOrEqual(monthEnd),
            endDate: MoreThanOrEqual(monthStart),
          },
          relations: ['employee', 'absenceType'],
        });

        for (const absence of absences) {
          events.push({
            id: absence.id,
            type: 'absence',
            title:
              absence.employee.firstName +
              ' ' +
              absence.employee.lastName +
              ' — ' +
              absence.absenceType.name,
            date: absence.startDate,
            endDate: absence.endDate,
            color: absence.absenceType.name === 'Férias' ? '#22C55E' : '#EAB308',
            metadata: { employeeId: absence.employeeId, absenceTypeId: absence.absenceTypeId },
          });
        }
      }
    }

    const employees = await this.employeeRepository.find({
      where: { status: EmployeeStatus.ACTIVE },
    });

    for (const employee of employees) {
      if (employee.birthDate) {
        const birthMonth = Number(employee.birthDate.split('-')[1]);

        if (birthMonth === month) {
          events.push({
            id: 'birth-' + employee.id,
            type: 'birthday',
            title: '🎂 ' + employee.firstName + ' ' + employee.lastName,
            date: String(year) + '-' + employee.birthDate.slice(5),
            color: '#EC4899',
            metadata: { employeeId: employee.id },
          });
        }
      }

      const workMonth = Number(employee.employmentStartDate.split('-')[1]);

      if (workMonth === month) {
        events.push({
          id: 'work-anniversary-' + employee.id,
          type: 'work-anniversary',
          title: '🎉 ' + employee.firstName + ' ' + employee.lastName,
          date: String(year) + '-' + employee.employmentStartDate.slice(5),
          color: '#3B82F6',
          metadata: { employeeId: employee.id },
        });
      }
    }

    return events.sort((a, b) => (a.date > b.date ? 1 : -1));
  }

  async isWorkingDay(date: string): Promise<boolean> {
    const parsed = new Date(date);
    const dayOfWeek = parsed.getDay();

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }

    const holiday = await this.holidayRepository.findOne({
      where: { holidayDate: date },
    });

    return holiday === null;
  }

  async getWorkingDaysInMonth(year: number, month: number): Promise<number> {
    const lastDay = new Date(year, month, 0).getDate();
    let count = 0;

    for (let day = 1; day <= lastDay; day++) {
      const dateStr =
        String(year) + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');

      if (await this.isWorkingDay(dateStr)) {
        count++;
      }
    }

    return count;
  }

  async createBlockedPeriod(
    dto: CreateBlockedPeriodDto,
    createdBy: string,
  ): Promise<BlockedPeriod> {
    if (dto.endDate < dto.startDate) {
      throw new BadRequestException('Data de fim não pode ser anterior à data de início');
    }

    const entity = this.blockedPeriodRepository.create({
      reason: dto.reason,
      startDate: dto.startDate,
      endDate: dto.endDate,
      scope: dto.scope ?? BlockedPeriodScope.ALL,
      createdBy,
    });

    return this.blockedPeriodRepository.save(entity);
  }

  async findBlockedPeriods(): Promise<BlockedPeriod[]> {
    return this.blockedPeriodRepository.find({ order: { startDate: 'ASC' } });
  }

  async removeBlockedPeriod(id: string): Promise<void> {
    await this.blockedPeriodRepository.delete(id);
  }

  async validateBlockedPeriodForAbsences(startDate: string, endDate: string): Promise<void> {
    const blocked = await this.blockedPeriodRepository.findOne({
      where: [
        {
          scope: BlockedPeriodScope.ALL,
          startDate: LessThanOrEqual(endDate),
          endDate: MoreThanOrEqual(startDate),
        },
        {
          scope: BlockedPeriodScope.ABSENCES,
          startDate: LessThanOrEqual(endDate),
          endDate: MoreThanOrEqual(startDate),
        },
      ],
    });

    if (blocked) {
      throw new BadRequestException(
        'Período bloqueado para ausências: ' + blocked.startDate + ' a ' + blocked.endDate,
      );
    }
  }

  async validateBlockedPeriodForTimesheets(date: string): Promise<void> {
    const blocked = await this.blockedPeriodRepository.findOne({
      where: [
        {
          scope: BlockedPeriodScope.ALL,
          startDate: LessThanOrEqual(date),
          endDate: MoreThanOrEqual(date),
        },
        {
          scope: BlockedPeriodScope.TIMESHEETS,
          startDate: LessThanOrEqual(date),
          endDate: MoreThanOrEqual(date),
        },
      ],
    });

    if (blocked) {
      throw new BadRequestException(
        'Período bloqueado para folhas de horas: ' + blocked.startDate + ' a ' + blocked.endDate,
      );
    }
  }

  async createCompanyEvent(dto: CreateCompanyEventDto, createdBy: string): Promise<CompanyEvent> {
    if (dto.endDate && dto.endDate < dto.startDate) {
      throw new BadRequestException('Data de fim não pode ser anterior à data de início');
    }

    const entity = this.eventRepository.create({
      title: dto.title,
      description: dto.description ?? null,
      startDate: dto.startDate,
      endDate: dto.endDate ?? null,
      type: dto.type ?? CompanyEventType.COMPANY,
      color: dto.color ?? null,
      isRecurring: dto.isRecurring ?? false,
      createdBy,
    });

    return this.eventRepository.save(entity);
  }

  async findCompanyEvents(): Promise<CompanyEvent[]> {
    return this.eventRepository.find({ order: { startDate: 'ASC' } });
  }

  async updateCompanyEvent(id: string, dto: CreateCompanyEventDto): Promise<CompanyEvent> {
    const event = await this.eventRepository.findOne({ where: { id } });

    if (!event) {
      throw new BadRequestException('Evento não encontrado');
    }

    if (dto.endDate && dto.endDate < dto.startDate) {
      throw new BadRequestException('Data de fim não pode ser anterior à data de início');
    }

    await this.eventRepository.update(id, {
      title: dto.title,
      description: dto.description ?? null,
      startDate: dto.startDate,
      endDate: dto.endDate ?? null,
      type: dto.type ?? CompanyEventType.COMPANY,
      color: dto.color ?? null,
      isRecurring: dto.isRecurring ?? false,
    });

    const updated = await this.eventRepository.findOne({ where: { id } });
    if (!updated) throw new BadRequestException('Evento não encontrado');
    return updated;
  }

  async removeCompanyEvent(id: string): Promise<void> {
    await this.eventRepository.delete(id);
  }
}
