import { DataSource } from 'typeorm';
import { Notification } from '../../../notifications/entities/notification.entity';
import { NotificationChannel } from '../../../notifications/entities/notification-channel.enum';
import { NotificationStatus } from '../../../notifications/entities/notification-status.enum';
import { Employee } from '../../../users/entities/employee.entity';
import { AbsenceRequest } from '../../../absences/entities/absence-request.entity';
import { AbsenceStatus } from '../../../absences/entities/absence-status.enum';
import { ExpenseReport } from '../../../expenses/entities/expense-report.entity';
import { ExpenseReportStatus } from '../../../expenses/entities/expense-report-status.enum';
import { Ticket } from '../../../helpdesk/entities/ticket.entity';

export async function run(dataSource: DataSource): Promise<void> {
  const notificationRepo = dataSource.getRepository(Notification);
  const employeeRepo = dataSource.getRepository(Employee);
  const requestRepo = dataSource.getRepository(AbsenceRequest);
  const reportRepo = dataSource.getRepository(ExpenseReport);
  const ticketRepo = dataSource.getRepository(Ticket);

  const mariana = await employeeRepo.findOneBy({ employeeNumber: 'EMP-001' });
  const sofia = await employeeRepo.findOneBy({ employeeNumber: 'EMP-005' });
  const rui = await employeeRepo.findOneBy({ employeeNumber: 'EMP-006' });
  const diogo = await employeeRepo.findOneBy({ employeeNumber: 'EMP-004' });

  const notifications: {
    recipientId: string | undefined;
    type: string;
    title: string;
    body: string;
    referenceId: string;
    referenceType: string;
    read: boolean;
  }[] = [];

  if (mariana && sofia) {
    const pendingAbsence = await requestRepo.findOneBy({
      employeeId: sofia.id,
      status: AbsenceStatus.PENDING,
    });
    if (pendingAbsence) {
      notifications.push({
        recipientId: mariana.id,
        type: 'absence.requested',
        title: 'Novo pedido de ausência',
        body: `${sofia.firstName} ${sofia.lastName} pediu férias de ${pendingAbsence.startDate} a ${pendingAbsence.endDate}.`,
        referenceId: pendingAbsence.id,
        referenceType: 'AbsenceRequest',
        read: false,
      });
    }

    const pendingExpense = await reportRepo.findOneBy({
      employeeId: sofia.id,
      status: ExpenseReportStatus.PENDING,
    });
    if (pendingExpense) {
      notifications.push({
        recipientId: mariana.id,
        type: 'expense.submitted',
        title: 'Nova despesa para aprovação',
        body: `${sofia.firstName} ${sofia.lastName} submeteu o relatório "${pendingExpense.title}".`,
        referenceId: pendingExpense.id,
        referenceType: 'ExpenseReport',
        read: false,
      });
    }
  }

  if (rui) {
    const paidExpense = await reportRepo.findOneBy({
      employeeId: rui.id,
      status: ExpenseReportStatus.PAID,
    });
    if (paidExpense) {
      notifications.push({
        recipientId: rui.id,
        type: 'expense.paid',
        title: 'Despesa paga',
        body: `O relatório "${paidExpense.title}" foi pago.`,
        referenceId: paidExpense.id,
        referenceType: 'ExpenseReport',
        read: true,
      });
    }
  }

  if (diogo) {
    const openTicket = await ticketRepo.findOneBy({ title: 'Acesso ao VPN não funciona' });
    if (openTicket) {
      notifications.push({
        recipientId: diogo.id,
        type: 'helpdesk.ticket-created',
        title: 'Novo ticket de helpdesk',
        body: `Novo ticket "${openTicket.title}" aberto.`,
        referenceId: openTicket.id,
        referenceType: 'Ticket',
        read: false,
      });
    }
  }

  for (const notif of notifications) {
    if (!notif.recipientId) continue;

    const existing = await notificationRepo.findOneBy({
      recipientId: notif.recipientId,
      type: notif.type,
      referenceId: notif.referenceId,
    });
    if (existing) continue;

    await notificationRepo.save(
      notificationRepo.create({
        recipientId: notif.recipientId,
        type: notif.type,
        title: notif.title,
        body: notif.body,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.SENT,
        referenceId: notif.referenceId,
        referenceType: notif.referenceType,
        sentAt: new Date(),
        readAt: notif.read ? new Date() : null,
      }),
    );
  }
}
