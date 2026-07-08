import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { WorkflowItem } from '../entities/workflow-item.entity';
import { WorkflowItemType } from '../entities/workflow-item-type.enum';
import { WorkflowItemStatus } from '../entities/workflow-item-status.enum';
import { TimesheetPeriod } from '../../timesheets/entities/timesheet-period.entity';
import { AbsenceRequest } from '../../absences/entities/absence-request.entity';
import { ExpenseReport } from '../../expenses/entities/expense-report.entity';
import { TimesheetsService } from '../../timesheets/services/timesheets.service';
import { AbsencesService } from '../../absences/services/absences.service';
import { ExpensesService } from '../../expenses/services/expenses.service';
import { TimesheetSubmittedEvent } from '../../timesheets/events/timesheet-submitted.event';
import { AbsenceRequestedEvent } from '../../absences/events/absence-requested.event';
import { ExpenseSubmittedEvent } from '../../expenses/events/expense-submitted.event';

@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(WorkflowItem)
    private readonly workflowItemRepository: Repository<WorkflowItem>,
    @InjectRepository(TimesheetPeriod)
    private readonly timesheetPeriodRepository: Repository<TimesheetPeriod>,
    @InjectRepository(AbsenceRequest)
    private readonly absenceRequestRepository: Repository<AbsenceRequest>,
    @InjectRepository(ExpenseReport)
    private readonly expenseReportRepository: Repository<ExpenseReport>,
    private readonly timesheetsService: TimesheetsService,
    private readonly absencesService: AbsencesService,
    private readonly expensesService: ExpensesService,
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

    const item = this.workflowItemRepository.create({
      type: WorkflowItemType.TIMESHEET,
      referenceId: event.periodId,
      referenceType: 'TimesheetPeriod',
      requesterId: period.employeeId,
      assigneeId: managerId,
      status: WorkflowItemStatus.PENDING,
      requestedAt: event.occurredAt,
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

    const managerId = request.employee.managerId;
    if (!managerId) return;

    const existing = await this.workflowItemRepository.findOne({
      where: {
        referenceId: event.absenceId,
        type: WorkflowItemType.ABSENCE,
        status: WorkflowItemStatus.PENDING,
      },
    });

    if (existing) return;

    const item = this.workflowItemRepository.create({
      type: WorkflowItemType.ABSENCE,
      referenceId: event.absenceId,
      referenceType: 'AbsenceRequest',
      requesterId: event.employeeId,
      assigneeId: managerId,
      status: WorkflowItemStatus.PENDING,
      requestedAt: event.occurredAt,
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

    const item = this.workflowItemRepository.create({
      type: WorkflowItemType.EXPENSE,
      referenceId: event.reportId,
      referenceType: 'ExpenseReport',
      requesterId: event.employeeId,
      assigneeId: managerId,
      status: WorkflowItemStatus.PENDING,
      requestedAt: event.occurredAt,
    });

    await this.workflowItemRepository.save(item);
  }
}
