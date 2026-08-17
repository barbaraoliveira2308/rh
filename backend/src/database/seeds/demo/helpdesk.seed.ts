import { DataSource } from 'typeorm';
import { TicketCategory } from '../../../helpdesk/entities/ticket-category.entity';
import { Ticket } from '../../../helpdesk/entities/ticket.entity';
import { TicketComment } from '../../../helpdesk/entities/ticket-comment.entity';
import { TicketPriority } from '../../../helpdesk/entities/ticket-priority.enum';
import { TicketStatus } from '../../../helpdesk/entities/ticket-status.enum';
import { Employee } from '../../../users/entities/employee.entity';

const categories = [
  { name: 'TI', defaultPriority: TicketPriority.MEDIUM, slaHours: 24 },
  { name: 'Recursos Humanos', defaultPriority: TicketPriority.LOW, slaHours: 48 },
];

const tickets: {
  title: string;
  description: string;
  categoryName: string;
  submitterEmployeeNumber: string;
  assigneeEmployeeNumber: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  resolved: boolean;
  comment: { authorEmployeeNumber: string; text: string } | null;
}[] = [
  {
    title: 'Acesso ao VPN não funciona',
    description:
      'Desde ontem que não consigo estabelecer ligação ao VPN da empresa a partir de casa.',
    categoryName: 'TI',
    submitterEmployeeNumber: 'EMP-005',
    assigneeEmployeeNumber: null,
    priority: TicketPriority.HIGH,
    status: TicketStatus.OPEN,
    resolved: false,
    comment: null,
  },
  {
    title: 'Dúvida sobre política de férias',
    description: 'Posso acumular dias de férias não gozados do ano passado para este ano?',
    categoryName: 'Recursos Humanos',
    submitterEmployeeNumber: 'EMP-007',
    assigneeEmployeeNumber: 'EMP-004',
    priority: TicketPriority.LOW,
    status: TicketStatus.RESOLVED,
    resolved: true,
    comment: {
      authorEmployeeNumber: 'EMP-004',
      text: 'Sim, até 5 dias podem transitar para o ano seguinte, conforme a Política de Teletrabalho e as regras internas de férias.',
    },
  },
];

export async function run(dataSource: DataSource): Promise<void> {
  const categoryRepo = dataSource.getRepository(TicketCategory);
  const ticketRepo = dataSource.getRepository(Ticket);
  const commentRepo = dataSource.getRepository(TicketComment);
  const employeeRepo = dataSource.getRepository(Employee);

  for (const seed of categories) {
    const existing = await categoryRepo.findOneBy({ name: seed.name });
    if (existing) continue;

    await categoryRepo.save(
      categoryRepo.create({
        name: seed.name,
        defaultPriority: seed.defaultPriority,
        slaHours: seed.slaHours,
      }),
    );
  }

  for (const seed of tickets) {
    const existing = await ticketRepo.findOneBy({ title: seed.title });
    if (existing) continue;

    const category = await categoryRepo.findOneBy({ name: seed.categoryName });
    const submitter = await employeeRepo.findOneBy({
      employeeNumber: seed.submitterEmployeeNumber,
    });
    const assignee = seed.assigneeEmployeeNumber
      ? await employeeRepo.findOneBy({ employeeNumber: seed.assigneeEmployeeNumber })
      : null;
    if (!submitter) continue;

    const ticket = await ticketRepo.save(
      ticketRepo.create({
        title: seed.title,
        description: seed.description,
        categoryId: category?.id ?? null,
        submitterId: submitter.id,
        assigneeId: assignee?.id ?? null,
        priority: seed.priority,
        status: seed.status,
        resolvedAt: seed.resolved ? new Date() : null,
      }),
    );

    if (seed.comment) {
      const author = await employeeRepo.findOneBy({
        employeeNumber: seed.comment.authorEmployeeNumber,
      });
      if (author) {
        await commentRepo.save(
          commentRepo.create({
            ticketId: ticket.id,
            userId: author.id,
            text: seed.comment.text,
            isInternal: false,
          }),
        );
      }
    }
  }
}
