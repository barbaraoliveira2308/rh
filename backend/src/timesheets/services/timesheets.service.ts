import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository, InjectEntityManager } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TimesheetPeriod } from '../entities/timesheet-period.entity';
import { TimesheetEntry } from '../entities/timesheet-entry.entity';
import { TimesheetApproval } from '../entities/timesheet-approval.entity';
import { HolidayCalendar } from '../entities/holiday-calendar.entity';
import { TimesheetStatus } from '../entities/timesheet-status.enum';
import { EntryType } from '../entities/entry-type.enum';
import { CreateTimesheetEntryDto } from '../dto/create-timesheet-entry.dto';
import { TimesheetSubmittedEvent } from '../events/timesheet-submitted.event';
import { TimesheetApprovedEvent } from '../events/timesheet-approved.event';
import { TimesheetRejectedEvent } from '../events/timesheet-rejected.event';
import { Employee, EmployeeStatus } from '../../users/entities/employee.entity';
import { CalendarService } from '../../calendar/services/calendar.service';

interface AbsenceRow {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  total_hours: number | null;
}

@Injectable()
export class TimesheetsService {
  constructor(
    @InjectRepository(TimesheetPeriod)
    private readonly periodRepository: Repository<TimesheetPeriod>,
    @InjectRepository(TimesheetEntry)
    private readonly entryRepository: Repository<TimesheetEntry>,
    @InjectRepository(TimesheetApproval)
    private readonly approvalRepository: Repository<TimesheetApproval>,
    @InjectRepository(HolidayCalendar)
    private readonly holidayRepository: Repository<HolidayCalendar>,
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    private readonly eventEmitter: EventEmitter2,
    private readonly calendarService: CalendarService,
  ) {}

  async generateMonthlyPeriods(year: number, month: number): Promise<number> {
    const employees = await this.employeeRepository.find({
      where: { status: EmployeeStatus.ACTIVE },
    });

    let createdCount = 0;
    const holidays = await this.holidayRepository.find();

    for (const employee of employees) {
      const existing = await this.periodRepository.findOne({
        where: { employeeId: employee.id, periodYear: year, periodMonth: month },
      });

      if (existing) continue;

      const period = this.periodRepository.create({
        employeeId: employee.id,
        periodYear: year,
        periodMonth: month,
        status: TimesheetStatus.IN_PROGRESS,
      });

      const saved = await this.periodRepository.save(period);

      const daysInMonth = new Date(year, month, 0).getDate();
      const entries: TimesheetEntry[] = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        const dateStr = this.formatDate(date);
        const isHoliday = holidays.some((h) => h.holidayDate === dateStr);

        let entryType: EntryType;
        let plannedHours: number;

        if (dayOfWeek === 0 || dayOfWeek === 6) {
          entryType = EntryType.WEEKEND;
          plannedHours = 0;
        } else if (isHoliday) {
          entryType = EntryType.HOLIDAY;
          plannedHours = 0;
        } else {
          entryType = EntryType.WORK;
          plannedHours = 8;
        }

        const entry = this.entryRepository.create({
          timesheetId: saved.id,
          entryDate: dateStr,
          plannedHours,
          workedHours: 0,
          overtimeHours: 0,
          entryType,
          isLocked: false,
        });

        entries.push(entry);
      }

      await this.entryRepository.save(entries);
      await this.recalculateTotals(saved.id);
      createdCount++;
    }

    return createdCount;
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return String(y) + '-' + m + '-' + d;
  }

  private async recalculateTotals(periodId: string): Promise<void> {
    const entries = await this.entryRepository.find({
      where: { timesheetId: periodId },
    });

    let totalPlanned = 0;
    let totalWorked = 0;
    let totalOvertime = 0;

    for (const entry of entries) {
      totalPlanned += entry.plannedHours;
      totalWorked += entry.workedHours;
      totalOvertime += entry.overtimeHours;
    }

    await this.periodRepository.update(periodId, {
      totalPlannedHours: totalPlanned,
      totalWorkedHours: totalWorked,
      totalOvertimeHours: totalOvertime,
      hoursBalance: totalWorked - totalPlanned,
    });
  }

  async findAll(filters?: {
    employeeId?: string;
    year?: number;
    month?: number;
    status?: TimesheetStatus;
  }): Promise<TimesheetPeriod[]> {
    const where: Record<string, unknown> = {};

    if (filters?.employeeId) where.employeeId = filters.employeeId;
    if (filters?.year) where.periodYear = filters.year;
    if (filters?.month) where.periodMonth = filters.month;
    if (filters?.status) where.status = filters.status;

    return this.periodRepository.find({
      where,
      relations: ['employee'],
      order: { periodYear: 'DESC', periodMonth: 'DESC' },
    });
  }

  async findOne(id: string): Promise<TimesheetPeriod> {
    const period = await this.periodRepository.findOne({
      where: { id },
      relations: ['employee', 'entries'],
    });

    if (!period) {
      throw new NotFoundException('Folha de horas não encontrada');
    }

    return period;
  }

  async updateEntry(
    periodId: string,
    entryId: string,
    employeeId: string,
    dto: CreateTimesheetEntryDto,
  ): Promise<TimesheetEntry> {
    const period = await this.periodRepository.findOne({
      where: { id: periodId },
    });

    if (!period) {
      throw new NotFoundException('Folha de horas não encontrada');
    }

    if (period.employeeId !== employeeId) {
      throw new ForbiddenException('Apenas o próprio pode editar a sua folha');
    }

    if (period.status !== TimesheetStatus.IN_PROGRESS) {
      throw new BadRequestException('Apenas folhas em rascunho podem ser editadas');
    }

    const entry = await this.entryRepository.findOne({
      where: { id: entryId, timesheetId: periodId },
    });

    if (!entry) {
      throw new NotFoundException('Entrada não encontrada');
    }

    if (entry.isLocked) {
      throw new BadRequestException('Entrada bloqueada após aprovação');
    }

    await this.calendarService.validateBlockedPeriodForTimesheets(entry.entryDate);

    const updateData: Record<string, unknown> = {};

    if (dto.workedHours !== undefined) {
      updateData.workedHours = dto.workedHours;
      updateData.overtimeHours = Math.max(0, dto.workedHours - 8);
    }

    if (dto.projectId !== undefined) {
      updateData.projectId = dto.projectId;
    }

    if (dto.notes !== undefined) {
      updateData.notes = dto.notes;
    }

    await this.entryRepository.update(entryId, updateData);
    await this.recalculateTotals(periodId);

    const updated = await this.entryRepository.findOne({ where: { id: entryId } });
    if (!updated) throw new NotFoundException('Entrada não encontrada');
    return updated;
  }

  async submitForApproval(periodId: string, employeeId: string): Promise<TimesheetPeriod> {
    const period = await this.periodRepository.findOne({
      where: { id: periodId },
      relations: ['entries'],
    });

    if (!period) {
      throw new NotFoundException('Folha de horas não encontrada');
    }

    if (period.employeeId !== employeeId) {
      throw new ForbiddenException('Apenas o próprio pode submeter a sua folha');
    }

    if (period.status !== TimesheetStatus.IN_PROGRESS) {
      throw new BadRequestException('Apenas folhas em rascunho podem ser submetidas');
    }

    period.status = TimesheetStatus.SUBMITTED;
    period.submittedAt = new Date();

    const saved = await this.periodRepository.save(period);

    this.eventEmitter.emit(
      'timesheet.submitted',
      new TimesheetSubmittedEvent(saved.id, employeeId),
    );

    return saved;
  }

  async approve(periodId: string, approverId: string, comment?: string): Promise<TimesheetPeriod> {
    const period = await this.periodRepository.findOne({
      where: { id: periodId },
      relations: ['entries'],
    });

    if (!period) {
      throw new NotFoundException('Folha de horas não encontrada');
    }

    if (period.status !== TimesheetStatus.SUBMITTED) {
      throw new BadRequestException('Apenas folhas submetidas podem ser aprovadas');
    }

    await this.validateApprover(period.employeeId, approverId);

    period.status = TimesheetStatus.APPROVED;
    period.approvedAt = new Date();
    period.approvedBy = approverId;

    const saved = await this.periodRepository.save(period);

    for (const entry of period.entries) {
      await this.entryRepository.update(entry.id, { isLocked: true });
    }

    const approval = this.approvalRepository.create({
      timesheetId: periodId,
      approvedBy: approverId,
      comment: comment ?? null,
    });

    await this.approvalRepository.save(approval);

    this.eventEmitter.emit('timesheet.approved', new TimesheetApprovedEvent(periodId, approverId));

    return saved;
  }

  async reject(periodId: string, approverId: string, reason: string): Promise<TimesheetPeriod> {
    const period = await this.periodRepository.findOne({
      where: { id: periodId },
    });

    if (!period) {
      throw new NotFoundException('Folha de horas não encontrada');
    }

    if (period.status !== TimesheetStatus.SUBMITTED) {
      throw new BadRequestException('Apenas folhas submetidas podem ser rejeitadas');
    }

    await this.validateApprover(period.employeeId, approverId);

    period.status = TimesheetStatus.REJECTED;

    const saved = await this.periodRepository.save(period);

    this.eventEmitter.emit(
      'timesheet.rejected',
      new TimesheetRejectedEvent(periodId, approverId, reason),
    );

    return saved;
  }

  private async validateApprover(employeeId: string, approverId: string): Promise<void> {
    const approver = await this.employeeRepository.findOne({
      where: { id: approverId },
    });

    if (!approver) {
      throw new NotFoundException('Aprovador não encontrado');
    }

    if (approver.status !== EmployeeStatus.ACTIVE) {
      throw new BadRequestException('Aprovador não está ativo');
    }

    const isAdmin = approver.userId === 'admin'; // simplified admin check

    if (isAdmin) return;

    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
      relations: ['manager'],
    });

    if (!employee) {
      throw new NotFoundException('Colaborador não encontrado');
    }

    if (employee.managerId !== approverId) {
      throw new ForbiddenException('Apenas o manager direto ou admin pode aprovar/rejeitar');
    }
  }

  async bulkApprove(periodIds: string[], approverId: string): Promise<TimesheetPeriod[]> {
    const results: TimesheetPeriod[] = [];

    for (const id of periodIds) {
      try {
        const approved = await this.approve(id, approverId);
        results.push(approved);
      } catch {
        continue;
      }
    }

    return results;
  }

  async syncAbsences(periodId: string): Promise<number> {
    const period = await this.periodRepository.findOne({
      where: { id: periodId },
    });

    if (!period) {
      throw new NotFoundException('Folha de horas não encontrada');
    }

    const year = period.periodYear;
    const month = period.periodMonth;
    const monthStart = String(year) + '-' + String(month).padStart(2, '0') + '-01';
    const lastDay = new Date(year, month, 0).getDate();
    const monthEnd =
      String(year) + '-' + String(month).padStart(2, '0') + '-' + String(lastDay).padStart(2, '0');

    const absences: AbsenceRow[] = await this.entityManager.query(
      `SELECT * FROM hr.absence_requests WHERE employee_id = $1 AND status = 'approved' AND start_date BETWEEN $2 AND $3`,
      [period.employeeId, monthStart, monthEnd],
    );

    let syncedCount = 0;

    for (const absence of absences) {
      const absStart = new Date(absence.start_date);
      const absEnd = new Date(absence.end_date);

      for (let d = new Date(absStart); d <= absEnd; d.setDate(d.getDate() + 1)) {
        const dateStr = this.formatDate(d);

        if (dateStr < monthStart || dateStr > monthEnd) continue;

        const existingEntry = await this.entryRepository.findOne({
          where: { timesheetId: periodId, entryDate: dateStr },
        });

        if (existingEntry) {
          if (existingEntry.entryType !== EntryType.ABSENCE && !existingEntry.isLocked) {
            await this.entryRepository.update(existingEntry.id, {
              entryType: EntryType.ABSENCE,
              workedHours: absence.total_hours ?? existingEntry.workedHours,
            });
            syncedCount++;
          }
        } else {
          const entry = this.entryRepository.create({
            timesheetId: periodId,
            entryDate: dateStr,
            plannedHours: 0,
            workedHours: absence.total_hours ?? 0,
            overtimeHours: 0,
            entryType: EntryType.ABSENCE,
            absenceId: absence.id,
            isLocked: false,
          });

          await this.entryRepository.save(entry);
          syncedCount++;
        }
      }
    }

    if (syncedCount > 0) {
      await this.recalculateTotals(periodId);
    }

    return syncedCount;
  }

  @Cron('0 8 1 * *')
  async generateNextMonthPeriods(): Promise<void> {
    const now = new Date();
    const nextYear = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
    const nextMonth = now.getMonth() === 11 ? 1 : now.getMonth() + 2;

    await this.generateMonthlyPeriods(nextYear, nextMonth);
  }

  @Cron('0 9 * * 1')
  async alertPendingSubmissions(): Promise<void> {
    const periods = await this.periodRepository.find({
      where: { status: TimesheetStatus.IN_PROGRESS },
      relations: ['employee'],
    });

    for (const period of periods) {
      this.eventEmitter.emit('timesheet.pending-submission', {
        periodId: period.id,
        employeeId: period.employeeId,
      });
    }
  }
}
