import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { WorkflowItem } from '../entities/workflow-item.entity';
import { WorkflowItemType } from '../entities/workflow-item-type.enum';
import { WorkflowItemStatus } from '../entities/workflow-item-status.enum';
import { WorkflowItemPriority } from '../entities/workflow-item-priority.enum';
import { TimesheetPeriod } from '../../timesheets/entities/timesheet-period.entity';
import { AbsenceRequest } from '../../absences/entities/absence-request.entity';
import { EmployeeProfileDetails } from '../../users/entities/employee-profile-details.entity';
import { ExpenseReport } from '../../expenses/entities/expense-report.entity';
import { TimesheetsService } from '../../timesheets/services/timesheets.service';
import { AbsencesService } from '../../absences/services/absences.service';
import { ExpensesService } from '../../expenses/services/expenses.service';
import { TimesheetSubmittedEvent } from '../../timesheets/events/timesheet-submitted.event';
import { AbsenceRequestedEvent } from '../../absences/events/absence-requested.event';
import { ExpenseSubmittedEvent } from '../../expenses/events/expense-submitted.event';
import { WorkflowTaskOverdueEvent } from '../events/workflow-task-overdue.event';
import { CalendarService } from '../../calendar/services/calendar.service';
import { AdminService } from '../../admin/admin.service';
import { BulkApproveResultItemDto } from '../dto/bulk-approve.dto';

const SLA_BUSINESS_DAYS: Record<WorkflowItemType, number> = {
  [WorkflowItemType.ABSENCE]: 2,
  [WorkflowItemType.EXPENSE]: 5,
  [WorkflowItemType.TIMESHEET]: 5,
};

@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(WorkflowItem)
    private readonly workflowItemRepository: Repository<WorkflowItem>,
    @InjectRepository(TimesheetPeriod)
    private readonly timesheetPeriodRepository: Repository<TimesheetPeriod>,
    @InjectRepository(AbsenceRequest)
    private readonly absenceRequestRepository: Repository<AbsenceRequest>,
    @InjectRepository(EmployeeProfileDetails)
    private readonly employeeProfileDetailsRepository: Repository<EmployeeProfileDetails>,
    @InjectRepository(ExpenseReport)
    private readonly expenseReportRepository: Repository<ExpenseReport>,
    private readonly timesheetsService: TimesheetsService,
    private readonly absencesService: AbsencesService,
    private readonly expensesService: ExpensesService,
    private readonly calendarService: CalendarService,
    private readonly adminService: AdminService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findInbox(userId: string, status?: WorkflowItemStatus): Promise<WorkflowItem[]> {
    const where: Record<string, unknown> = { assigneeId: userId };

    if (status) {
      where.status = status;
    } else {
      where.status = WorkflowItemStatus.PENDING;
    }

    return this.workflowItemRepository.find({
      where,
      order: { requestedAt: 'DESC' },
    });
  }

  async countPending(userId: string): Promise<number> {
    return this.workflowItemRepository.count({
      where: { assigneeId: userId, status: WorkflowItemStatus.PENDING },
    });
  }

  async approve(itemId: string, userId: string, reason?: string): Promise<WorkflowItem> {
    const item = await this.workflowItemRepository.findOne({ where: { id: itemId } });

    if (!item) {
      throw new NotFoundException('Item de workflow não encontrado');
    }

    if (item.status !== WorkflowItemStatus.PENDING) {
      throw new BadRequestException('Apenas itens pendentes podem ser aprovados');
    }

    if (item.assigneeId !== userId) {
      throw new BadRequestException('Apenas o responsável pode aprovar este item');
    }

    await this.delegateAction(item, 'approve', reason);

    item.status = WorkflowItemStatus.APPROVED;
    item.resolvedAt = new Date();

    return this.workflowItemRepository.save(item);
  }

  async reject(itemId: string, userId: string, reason: string): Promise<WorkflowItem> {
    const item = await this.workflowItemRepository.findOne({ where: { id: itemId } });

    if (!item) {
      throw new NotFoundException('Item de workflow não encontrado');
    }

    if (item.status !== WorkflowItemStatus.PENDING) {
      throw new BadRequestException('Apenas itens pendentes podem ser rejeitados');
    }

    if (item.assigneeId !== userId) {
      throw new BadRequestException('Apenas o responsável pode rejeitar este item');
    }

    await this.delegateAction(item, 'reject', reason);

    item.status = WorkflowItemStatus.REJECTED;
    item.resolvedAt = new Date();

    return this.workflowItemRepository.save(item);
  }

  async bulkApprove(
    ids: string[],
    userId: string,
    reason?: string,
  ): Promise<BulkApproveResultItemDto[]> {
    const items = await this.workflowItemRepository.find({ where: { id: In(ids) } });
    const foundIds = new Set(items.map((item) => item.id));
    const missingIds = ids.filter((id) => !foundIds.has(id));

    const distinctTypes = new Set(items.map((item) => item.type));
    if (distinctTypes.size > 1) {
      throw new BadRequestException('Aprovação em massa aplica-se apenas a tarefas do mesmo tipo');
    }

    const results: BulkApproveResultItemDto[] = missingIds.map((id) => ({
      id,
      success: false,
      error: 'Item de workflow não encontrado',
    }));

    for (const item of items) {
      try {
        await this.approve(item.id, userId, reason);
        results.push({ id: item.id, success: true });
      } catch (error) {
        results.push({
          id: item.id,
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    }

    return results;
  }

  @Cron('0 5 * * *')
  async markOverdueTasks(): Promise<void> {
    const overdueItems = await this.workflowItemRepository.find({
      where: {
        status: WorkflowItemStatus.PENDING,
        dueDate: LessThan(new Date()),
        isOverdue: false,
      },
    });

    for (const item of overdueItems) {
      item.isOverdue = true;
      item.priority = WorkflowItemPriority.URGENT;
      await this.workflowItemRepository.save(item);

      this.eventEmitter.emit(
        'workflow.task-overdue',
        new WorkflowTaskOverdueEvent(item.id, item.assigneeId),
      );
    }
  }

  private async calculateDueDate(
    type: WorkflowItemType,
    requestedAt: Date,
    employeeId: string,
  ): Promise<Date> {
    const slaBusinessDays = SLA_BUSINESS_DAYS[type];
    const countryCode = await this.adminService.getEffectiveCountryCode(employeeId);

    const fetchedYears = new Set<number>();
    const holidayDates = new Set<string>();
    const cursor = new Date(requestedAt);
    let remaining = slaBusinessDays;

    while (remaining > 0) {
      cursor.setDate(cursor.getDate() + 1);
      const dayOfWeek = cursor.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      const year = cursor.getFullYear();
      if (!fetchedYears.has(year)) {
        const holidays = await this.calendarService.findHolidays(year, countryCode);
        holidays.forEach((h) => holidayDates.add(h.holidayDate));
        fetchedYears.add(year);
      }

      const dateStr =
        String(cursor.getFullYear()) +
        '-' +
        String(cursor.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(cursor.getDate()).padStart(2, '0');

      if (holidayDates.has(dateStr)) continue;

      remaining -= 1;
    }

    return cursor;
  }

  private async delegateAction(
    item: WorkflowItem,
    action: 'approve' | 'reject',
    reason?: string,
  ): Promise<void> {
    if (item.type === WorkflowItemType.TIMESHEET) {
      if (action === 'approve') {
        await this.timesheetsService.approve(item.referenceId, item.assigneeId);
      } else {
        await this.timesheetsService.reject(item.referenceId, item.assigneeId, reason ?? '');
      }
    } else if (item.type === WorkflowItemType.ABSENCE) {
      if (action === 'approve') {
        await this.absencesService.approve(item.referenceId, item.assigneeId);
      } else {
        await this.absencesService.reject(item.referenceId, item.assigneeId, reason ?? '');
      }
    } else {
      if (action === 'approve') {
        await this.expensesService.approve(item.referenceId, item.assigneeId);
      } else {
        await this.expensesService.reject(item.referenceId, item.assigneeId, reason ?? '');
      }
    }
  }

  @OnEvent('timesheet.submitted')
  async handleTimesheetSubmitted(event: TimesheetSubmittedEvent): Promise<void> {
    const period = await this.timesheetPeriodRepository.findOne({
      where: { id: event.periodId },
      relations: ['employee'],
    });

    if (!period) return;

    const managerId = period.employee.managerId;
    if (!managerId) return;

    const existing = await this.workflowItemRepository.findOne({
      where: {
        referenceId: event.periodId,
        type: WorkflowItemType.TIMESHEET,
        status: WorkflowItemStatus.PENDING,
      },
    });

    if (existing) return;

    const dueDate = await this.calculateDueDate(
      WorkflowItemType.TIMESHEET,
      event.occurredAt,
      period.employeeId,
    );

    const item = this.workflowItemRepository.create({
      type: WorkflowItemType.TIMESHEET,
      referenceId: event.periodId,
      referenceType: 'TimesheetPeriod',
      requesterId: period.employeeId,
      assigneeId: managerId,
      status: WorkflowItemStatus.PENDING,
      requestedAt: event.occurredAt,
      dueDate,
    });

    await this.workflowItemRepository.save(item);
  }

  @OnEvent('absence.requested')
  async handleAbsenceRequested(event: AbsenceRequestedEvent): Promise<void> {
    const request = await this.absenceRequestRepository.findOne({
      where: { id: event.absenceId },
      relations: ['employee'],
    });

    if (!request) return;

    const profileDetails = await this.employeeProfileDetailsRepository.findOne({
      where: { employeeId: event.employeeId },
      select: ['absenceApproverId'],
    });
    const approverId = profileDetails?.absenceApproverId ?? request.employee.managerId;
    if (!approverId) return;

    const existing = await this.workflowItemRepository.findOne({
      where: {
        referenceId: event.absenceId,
        type: WorkflowItemType.ABSENCE,
        status: WorkflowItemStatus.PENDING,
      },
    });

    if (existing) return;

    const dueDate = await this.calculateDueDate(
      WorkflowItemType.ABSENCE,
      event.occurredAt,
      event.employeeId,
    );

    const item = this.workflowItemRepository.create({
      type: WorkflowItemType.ABSENCE,
      referenceId: event.absenceId,
      referenceType: 'AbsenceRequest',
      requesterId: event.employeeId,
      assigneeId: approverId,
      status: WorkflowItemStatus.PENDING,
      requestedAt: event.occurredAt,
      dueDate,
    });

    await this.workflowItemRepository.save(item);
  }

  @OnEvent('expense.submitted')
  async handleExpenseSubmitted(event: ExpenseSubmittedEvent): Promise<void> {
    const report = await this.expenseReportRepository.findOne({
      where: { id: event.reportId },
      relations: ['employee'],
    });

    if (!report) return;

    const managerId = report.employee.managerId;
    if (!managerId) return;

    const existing = await this.workflowItemRepository.findOne({
      where: {
        referenceId: event.reportId,
        type: WorkflowItemType.EXPENSE,
        status: WorkflowItemStatus.PENDING,
      },
    });

    if (existing) return;

    const dueDate = await this.calculateDueDate(
      WorkflowItemType.EXPENSE,
      event.occurredAt,
      event.employeeId,
    );

    const item = this.workflowItemRepository.create({
      type: WorkflowItemType.EXPENSE,
      referenceId: event.reportId,
      referenceType: 'ExpenseReport',
      requesterId: event.employeeId,
      assigneeId: managerId,
      status: WorkflowItemStatus.PENDING,
      dueDate,
      requestedAt: event.occurredAt,
    });

    await this.workflowItemRepository.save(item);
  }
}
