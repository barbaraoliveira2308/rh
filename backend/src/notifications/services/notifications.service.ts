import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as nodemailer from 'nodemailer';
import * as Handlebars from 'handlebars';
import { Notification } from '../entities/notification.entity';
import { NotificationTemplate } from '../entities/notification-template.entity';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { NotificationChannel } from '../entities/notification-channel.enum';
import { NotificationStatus } from '../entities/notification-status.enum';
import { Employee } from '../../users/entities/employee.entity';
import { TimesheetPeriod } from '../../timesheets/entities/timesheet-period.entity';
import { AbsenceRequest } from '../../absences/entities/absence-request.entity';
import { Project } from '../../projects/entities/project.entity';
import { TimesheetSubmittedEvent } from '../../timesheets/events/timesheet-submitted.event';
import { TimesheetApprovedEvent } from '../../timesheets/events/timesheet-approved.event';
import { TimesheetRejectedEvent } from '../../timesheets/events/timesheet-rejected.event';
import { AbsenceRequestedEvent } from '../../absences/events/absence-requested.event';
import { AbsenceApprovedEvent } from '../../absences/events/absence-approved.event';
import { AbsenceRejectedEvent } from '../../absences/events/absence-rejected.event';
import { ContractExpiringSoonEvent } from '../../contracts/events/contract-expiring-soon.event';
import { ProjectEndingAlertEvent } from '../../projects/events/project-ending-alert.event';
import { AllocationEndingAlertEvent } from '../../projects/events/allocation-ending-alert.event';
import { OverallocationDetectedEvent } from '../../projects/events/overallocation-detected.event';
import { ExpenseApprovedEvent } from '../../expenses/events/expense-approved.event';
import { ExpenseRejectedEvent } from '../../expenses/events/expense-rejected.event';
import { DataSubjectRequestCompletedEvent } from '../../gdpr/events/data-subject-request-completed.event';
import { PersonalDataExportedEvent } from '../../gdpr/events/personal-data-exported.event';

interface TimesheetPendingSubmissionEvent {
  periodId: string;
  employeeId: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly transporter: nodemailer.Transporter | null = null;

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationTemplate)
    private readonly templateRepository: Repository<NotificationTemplate>,
    @InjectRepository(NotificationPreference)
    private readonly preferenceRepository: Repository<NotificationPreference>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(TimesheetPeriod)
    private readonly timesheetPeriodRepository: Repository<TimesheetPeriod>,
    @InjectRepository(AbsenceRequest)
    private readonly absenceRequestRepository: Repository<AbsenceRequest>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;

    if (smtpHost) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        auth: {
          user: process.env.SMTP_USER ?? '',
          pass: process.env.SMTP_PASS ?? '',
        },
      });
    }
  }

  async sendEmail(
    to: string,
    templateCode: string,
    variables: Record<string, unknown>,
  ): Promise<void> {
    const template = await this.templateRepository.findOne({
      where: { code: templateCode, channel: NotificationChannel.EMAIL, isActive: true },
    });

    if (!template) {
      this.logger.warn('Email template not found: ' + templateCode);
      return;
    }

    const compiledSubject = Handlebars.compile(template.subject);
    const compiledBody = Handlebars.compile(template.body);

    const subject = compiledSubject(variables);
    const html = compiledBody(variables);

    if (!this.transporter) {
      this.logger.warn('SMTP not configured; email not sent to ' + to);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM ?? 'noreply@hr-suite.local',
        to,
        subject,
        html,
      });
    } catch (error) {
      this.logger.error(
        'Failed to send email: ' + (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async sendInApp(
    userId: string,
    type: string,
    title: string,
    message: string,
    referenceId?: string,
    referenceType?: string,
  ): Promise<Notification> {
    const preference = await this.getPreference(userId, type);

    if (!preference.inAppEnabled) {
      const skipped = this.notificationRepository.create({
        recipientId: userId,
        type,
        title,
        body: message,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.SENT,
        referenceId: referenceId ?? null,
        referenceType: referenceType ?? null,
      });
      return skipped;
    }

    const notification = this.notificationRepository.create({
      recipientId: userId,
      type,
      title,
      body: message,
      channel: NotificationChannel.IN_APP,
      status: NotificationStatus.SENT,
      referenceId: referenceId ?? null,
      referenceType: referenceType ?? null,
      sentAt: new Date(),
    });

    return this.notificationRepository.save(notification);
  }

  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notificação não encontrada');
    }

    if (notification.recipientId !== userId) {
      throw new NotFoundException('Notificação não encontrada');
    }

    notification.status = NotificationStatus.READ;
    notification.readAt = new Date();

    return this.notificationRepository.save(notification);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { recipientId: userId, status: NotificationStatus.SENT },
      { status: NotificationStatus.READ, readAt: new Date() },
    );
  }

  async findByUser(
    userId: string,
    options: { page?: number; limit?: number } = {},
  ): Promise<{ items: Notification[]; total: number }> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;

    const [items, total] = await this.notificationRepository.findAndCount({
      where: { recipientId: userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total };
  }

  async countUnread(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: {
        recipientId: userId,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.SENT,
      },
    });
  }

  async getPreferences(userId: string): Promise<NotificationPreference[]> {
    return this.preferenceRepository.find({
      where: { employeeId: userId },
      order: { notificationType: 'ASC' },
    });
  }

  async updatePreferences(
    userId: string,
    preferences: Partial<NotificationPreference>[],
  ): Promise<NotificationPreference[]> {
    const updated: NotificationPreference[] = [];

    for (const pref of preferences) {
      if (!pref.notificationType) continue;

      const existing = await this.preferenceRepository.findOne({
        where: { employeeId: userId, notificationType: pref.notificationType },
      });

      if (existing) {
        if (pref.emailEnabled !== undefined) {
          existing.emailEnabled = pref.emailEnabled;
        }
        if (pref.inAppEnabled !== undefined) {
          existing.inAppEnabled = pref.inAppEnabled;
        }
        updated.push(await this.preferenceRepository.save(existing));
      } else {
        const created = this.preferenceRepository.create({
          employeeId: userId,
          notificationType: pref.notificationType,
          emailEnabled: pref.emailEnabled ?? true,
          inAppEnabled: pref.inAppEnabled ?? true,
        });
        updated.push(await this.preferenceRepository.save(created));
      }
    }

    return updated;
  }

  private async getPreference(userId: string, type: string): Promise<NotificationPreference> {
    let preference = await this.preferenceRepository.findOne({
      where: { employeeId: userId, notificationType: type },
    });

    if (!preference) {
      preference = this.preferenceRepository.create({
        employeeId: userId,
        notificationType: type,
        emailEnabled: true,
        inAppEnabled: true,
      });
      preference = await this.preferenceRepository.save(preference);
    }

    return preference;
  }

  private async notify(
    userId: string,
    type: string,
    title: string,
    message: string,
    emailTemplateCode: string,
    emailVariables: Record<string, unknown>,
    referenceId?: string,
    referenceType?: string,
  ): Promise<void> {
    const preference = await this.getPreference(userId, type);
    const employee = await this.employeeRepository.findOne({ where: { id: userId } });

    if (preference.inAppEnabled) {
      await this.sendInApp(userId, type, title, message, referenceId, referenceType);
    }

    if (preference.emailEnabled && employee) {
      await this.sendEmail(employee.email, emailTemplateCode, emailVariables);
    }
  }

  @OnEvent('timesheet.submitted')
  async handleTimesheetSubmitted(event: TimesheetSubmittedEvent): Promise<void> {
    const period = await this.timesheetPeriodRepository.findOne({
      where: { id: event.periodId },
      relations: ['employee'],
    });

    if (!period?.employee) return;

    const managerId = period.employee.managerId;
    if (!managerId) return;

    const monthKey = String(period.periodYear) + '-' + String(period.periodMonth).padStart(2, '0');

    await this.notify(
      managerId,
      'timesheet.submitted',
      'Timesheet submetida',
      period.employee.firstName +
        ' ' +
        period.employee.lastName +
        ' submeteu a timesheet de ' +
        monthKey,
      'timesheet-submitted',
      {
        employeeName: period.employee.firstName + ' ' + period.employee.lastName,
        period: monthKey,
        link: '/timesheets/' + event.periodId,
      },
      event.periodId,
      'TimesheetPeriod',
    );
  }

  @OnEvent('timesheet.approved')
  async handleTimesheetApproved(event: TimesheetApprovedEvent): Promise<void> {
    const period = await this.timesheetPeriodRepository.findOne({
      where: { id: event.periodId },
      relations: ['employee'],
    });

    if (!period?.employee) return;

    const monthKey = String(period.periodYear) + '-' + String(period.periodMonth).padStart(2, '0');

    await this.notify(
      period.employeeId,
      'timesheet.approved',
      'Timesheet aprovada',
      'A tua timesheet de ' + monthKey + ' foi aprovada',
      'timesheet-approved',
      {
        employeeName: period.employee.firstName,
        period: monthKey,
        link: '/timesheets/' + event.periodId,
      },
      event.periodId,
      'TimesheetPeriod',
    );
  }

  @OnEvent('timesheet.rejected')
  async handleTimesheetRejected(event: TimesheetRejectedEvent): Promise<void> {
    const period = await this.timesheetPeriodRepository.findOne({
      where: { id: event.periodId },
      relations: ['employee'],
    });

    if (!period?.employee) return;

    const monthKey = String(period.periodYear) + '-' + String(period.periodMonth).padStart(2, '0');

    await this.notify(
      period.employeeId,
      'timesheet.rejected',
      'Timesheet rejeitada',
      'A tua timesheet de ' + monthKey + ' foi rejeitada',
      'timesheet-rejected',
      {
        employeeName: period.employee.firstName,
        period: monthKey,
        reason: event.reason,
        link: '/timesheets/' + event.periodId,
      },
      event.periodId,
      'TimesheetPeriod',
    );
  }

  @OnEvent('absence.requested')
  async handleAbsenceRequested(event: AbsenceRequestedEvent): Promise<void> {
    const request = await this.absenceRequestRepository.findOne({
      where: { id: event.absenceId },
      relations: ['employee'],
    });

    if (!request?.employee) return;

    const managerId = request.employee.managerId;
    if (!managerId) return;

    await this.notify(
      managerId,
      'absence.requested',
      'Pedido de ausência submetido',
      request.employee.firstName +
        ' ' +
        request.employee.lastName +
        ' solicitou ausência de ' +
        request.startDate +
        ' a ' +
        request.endDate,
      'absence-requested',
      {
        employeeName: request.employee.firstName + ' ' + request.employee.lastName,
        startDate: request.startDate,
        endDate: request.endDate,
        link: '/absences/' + event.absenceId,
      },
      event.absenceId,
      'AbsenceRequest',
    );
  }

  @OnEvent('absence.approved')
  async handleAbsenceApproved(event: AbsenceApprovedEvent): Promise<void> {
    const request = await this.absenceRequestRepository.findOne({
      where: { id: event.absenceId },
      relations: ['employee'],
    });

    if (!request?.employee) return;

    await this.notify(
      event.employeeId,
      'absence.approved',
      'Pedido de ausência aprovado',
      'O teu pedido de ausência de ' +
        request.startDate +
        ' a ' +
        request.endDate +
        ' foi aprovado',
      'absence-approved',
      {
        employeeName: request.employee.firstName,
        startDate: request.startDate,
        endDate: request.endDate,
        link: '/absences/' + event.absenceId,
      },
      event.absenceId,
      'AbsenceRequest',
    );
  }

  @OnEvent('absence.rejected')
  async handleAbsenceRejected(event: AbsenceRejectedEvent): Promise<void> {
    const request = await this.absenceRequestRepository.findOne({
      where: { id: event.absenceId },
      relations: ['employee'],
    });

    if (!request?.employee) return;

    await this.notify(
      event.employeeId,
      'absence.rejected',
      'Pedido de ausência rejeitado',
      'O teu pedido de ausência de ' +
        request.startDate +
        ' a ' +
        request.endDate +
        ' foi rejeitado',
      'absence-rejected',
      {
        employeeName: request.employee.firstName,
        startDate: request.startDate,
        endDate: request.endDate,
        reason: event.reason,
        link: '/absences/' + event.absenceId,
      },
      event.absenceId,
      'AbsenceRequest',
    );
  }

  @OnEvent('contract.expiring-soon')
  async handleContractExpiringSoon(event: ContractExpiringSoonEvent): Promise<void> {
    const employee = await this.employeeRepository.findOne({
      where: { id: event.employeeId },
    });

    if (!employee) return;

    await this.notify(
      event.employeeId,
      'contract.expiring-soon',
      'Contrato a expirar',
      'O teu contrato vai expirar em ' + String(event.daysRemaining) + ' dias',
      'contract-expiring',
      {
        employeeName: employee.firstName,
        contractType: 'contrato',
        endDate: event.endDate,
        daysRemaining: event.daysRemaining,
      },
      event.contractId,
      'Contract',
    );
  }

  @OnEvent('project.ending-alert')
  async handleProjectEndingAlert(event: ProjectEndingAlertEvent): Promise<void> {
    const project = await this.projectRepository.findOne({
      where: { id: event.projectId },
      relations: ['manager'],
    });

    if (!project?.manager) return;

    await this.notify(
      project.managerId,
      'project.ending-alert',
      'Projeto próximo do fim',
      'O projeto ' + event.projectName + ' termina em ' + String(event.daysRemaining) + ' dias',
      'project-ending',
      {
        projectName: event.projectName,
        endDate: event.endDate,
        daysRemaining: event.daysRemaining,
        link: '/projects/' + event.projectId,
      },
      event.projectId,
      'Project',
    );
  }

  @OnEvent('project.allocation-ending-alert')
  async handleAllocationEndingAlert(event: AllocationEndingAlertEvent): Promise<void> {
    const employee = await this.employeeRepository.findOne({
      where: { id: event.employeeId },
    });

    if (!employee) return;

    await this.notify(
      event.employeeId,
      'project.allocation-ending-alert',
      'Alocação próxima do fim',
      'A tua alocação no projeto termina em ' + String(event.daysRemaining) + ' dias',
      'project-ending',
      {
        projectName: event.projectId,
        endDate: event.endDate,
        daysRemaining: event.daysRemaining,
        link: '/projects/' + event.projectId,
      },
      event.allocationId,
      'ProjectAllocation',
    );
  }

  @OnEvent('expense.approved')
  async handleExpenseApproved(event: ExpenseApprovedEvent): Promise<void> {
    const employee = await this.employeeRepository.findOne({ where: { id: event.employeeId } });

    if (!employee) return;

    await this.notify(
      event.employeeId,
      'expense.approved',
      'Despesa aprovada',
      'O teu relatório de despesas foi aprovado',
      'expense-approved',
      {
        employeeName: employee.firstName,
        link: '/expenses/' + event.reportId,
      },
      event.reportId,
      'ExpenseReport',
    );
  }

  @OnEvent('expense.rejected')
  async handleExpenseRejected(event: ExpenseRejectedEvent): Promise<void> {
    const employee = await this.employeeRepository.findOne({ where: { id: event.employeeId } });

    if (!employee) return;

    await this.notify(
      event.employeeId,
      'expense.rejected',
      'Despesa rejeitada',
      'O teu relatório de despesas foi rejeitado',
      'expense-rejected',
      {
        employeeName: employee.firstName,
        reason: event.reason,
        link: '/expenses/' + event.reportId,
      },
      event.reportId,
      'ExpenseReport',
    );
  }

  @OnEvent('allocation.overallocation-detected')
  async handleOverallocationDetected(event: OverallocationDetectedEvent): Promise<void> {
    const employee = await this.employeeRepository.findOne({ where: { id: event.employeeId } });

    if (!employee?.managerId) return;

    await this.notify(
      employee.managerId,
      'allocation.overallocation-detected',
      'Sobrealocação detetada',
      employee.firstName +
        ' ' +
        employee.lastName +
        ' está alocado a ' +
        String(event.totalPercentage) +
        '% (acima de 100%)',
      'overallocation-detected',
      {
        employeeName: employee.firstName + ' ' + employee.lastName,
        totalPercentage: event.totalPercentage,
        link: '/projects/' + event.projectId,
      },
      event.projectId,
      'Project',
    );
  }

  @OnEvent('timesheet.pending-submission')
  async handleTimesheetPendingSubmission(event: TimesheetPendingSubmissionEvent): Promise<void> {
    const period = await this.timesheetPeriodRepository.findOne({
      where: { id: event.periodId },
      relations: ['employee'],
    });

    if (!period?.employee) return;

    const monthKey = String(period.periodYear) + '-' + String(period.periodMonth).padStart(2, '0');

    await this.notify(
      event.employeeId,
      'timesheet.pending-submission',
      'Timesheet por submeter',
      'A tua timesheet de ' + monthKey + ' ainda não foi submetida',
      'timesheet-pending',
      {
        employeeName: period.employee.firstName,
        period: monthKey,
        link: '/timesheets/' + event.periodId,
      },
      event.periodId,
      'TimesheetPeriod',
    );
  }

  @OnEvent('gdpr.request.completed')
  async handleGdprRequestCompleted(event: DataSubjectRequestCompletedEvent): Promise<void> {
    const employee = await this.employeeRepository.findOne({ where: { id: event.subjectId } });

    if (!employee) return;

    await this.notify(
      event.subjectId,
      'gdpr.request.completed',
      'Pedido de titular concluído',
      'O teu pedido de titular de dados (' + event.requestType + ') foi concluído',
      'gdpr-request-completed',
      {
        employeeName: employee.firstName,
        requestType: event.requestType,
        link: '/gdpr',
      },
      event.requestId,
      'DataSubjectRequest',
    );
  }

  @OnEvent('gdpr.data.exported')
  async handleGdprDataExported(event: PersonalDataExportedEvent): Promise<void> {
    const employee = await this.employeeRepository.findOne({ where: { id: event.subjectId } });

    if (!employee) return;

    await this.notify(
      event.subjectId,
      'gdpr.data.exported',
      'Dados pessoais exportados',
      'Os teus dados pessoais foram exportados no âmbito de um pedido de titular',
      'gdpr-data-exported',
      {
        employeeName: employee.firstName,
        requestType: event.requestType,
        link: '/gdpr',
      },
      event.requestId,
      'DataSubjectRequest',
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupExpiredNotifications(): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    await this.notificationRepository.delete({
      channel: NotificationChannel.IN_APP,
      createdAt: LessThan(cutoff),
    });
  }
}
