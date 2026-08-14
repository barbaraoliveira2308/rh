import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Ticket } from './entities/ticket.entity';
import { TicketComment } from './entities/ticket-comment.entity';
import { TicketSla } from './entities/ticket-sla.entity';
import { TicketCategory } from './entities/ticket-category.entity';
import { TicketPriority } from './entities/ticket-priority.enum';
import { TicketStatus } from './entities/ticket-status.enum';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateTicketCategoryDto } from './dto/create-ticket-category.dto';
import { AddCommentDto } from './dto/add-comment.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

const DEFAULT_SLA_HOURS: Record<TicketPriority, number> = {
  [TicketPriority.LOW]: 120,
  [TicketPriority.MEDIUM]: 48,
  [TicketPriority.HIGH]: 4,
  [TicketPriority.URGENT]: 1,
};

@Injectable()
export class HelpdeskService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(TicketComment)
    private readonly commentRepository: Repository<TicketComment>,
    @InjectRepository(TicketSla)
    private readonly slaRepository: Repository<TicketSla>,
    @InjectRepository(TicketCategory)
    private readonly categoryRepository: Repository<TicketCategory>,
  ) {}

  async create(dto: CreateTicketDto, employeeId: string): Promise<Ticket> {
    let priority = TicketPriority.MEDIUM;
    let slaHours = DEFAULT_SLA_HOURS[TicketPriority.MEDIUM];

    if (dto.categoryId) {
      const category = await this.categoryRepository.findOne({ where: { id: dto.categoryId } });
      if (category) {
        priority = category.defaultPriority;
        slaHours = category.slaHours;
      }
    }

    const slaDeadline = new Date(Date.now() + slaHours * 3600 * 1000);

    const ticket = this.ticketRepository.create({
      title: dto.title,
      description: dto.description,
      categoryId: dto.categoryId ?? null,
      teamId: dto.teamId ?? null,
      submitterId: employeeId,
      priority,
      status: TicketStatus.OPEN,
      slaDeadline,
    });

    const saved = await this.ticketRepository.save(ticket);

    await this.slaRepository.save(
      this.slaRepository.create({
        ticketId: saved.id,
        priority,
        deadline: slaDeadline,
      }),
    );

    return saved;
  }

  async findAll(
    userId: string,
    userRole: string,
    filters?: { status?: string; priority?: string; categoryId?: string },
  ): Promise<Ticket[]> {
    const query = this.ticketRepository.createQueryBuilder('t');

    if (userRole !== 'admin' && userRole !== 'manager') {
      query.where('t.submitterId = :userId', { userId });
    }

    if (filters?.status) {
      query.andWhere('t.status = :status', { status: filters.status });
    }

    if (filters?.priority) {
      query.andWhere('t.priority = :priority', { priority: filters.priority });
    }

    if (filters?.categoryId) {
      query.andWhere('t.categoryId = :categoryId', { categoryId: filters.categoryId });
    }

    return query.orderBy('t.createdAt', 'DESC').getMany();
  }

  async findOne(id: string): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id },
    });
    if (!ticket) {
      throw new NotFoundException('Ticket não encontrado');
    }
    return ticket;
  }

  async update(id: string, dto: UpdateTicketDto): Promise<Ticket> {
    const ticket = await this.findOne(id);
    if (ticket.status === TicketStatus.CLOSED) {
      const isReopening = dto.status !== undefined && dto.status !== TicketStatus.CLOSED;
      if (!isReopening) {
        throw new BadRequestException('Não é possível alterar um ticket fechado');
      }
      if (this.daysSinceClosed(ticket) > 7) {
        throw new BadRequestException('Não é possível reabrir um ticket fechado há mais de 7 dias');
      }
      ticket.resolvedAt = null;
    }
    Object.assign(ticket, {
      title: dto.title ?? ticket.title,
      description: dto.description ?? ticket.description,
      categoryId: dto.categoryId ?? ticket.categoryId,
      assigneeId: dto.assigneeId ?? ticket.assigneeId,
      teamId: dto.teamId ?? ticket.teamId,
      priority: dto.priority ?? ticket.priority,
      status: dto.status ?? ticket.status,
    });
    return this.ticketRepository.save(ticket);
  }

  private daysSinceClosed(ticket: Ticket): number {
    const closedTime = ticket.resolvedAt ?? ticket.updatedAt;
    return (Date.now() - new Date(closedTime).getTime()) / (1000 * 3600 * 24);
  }

  async assign(ticketId: string, dto: AssignTicketDto): Promise<Ticket> {
    const ticket = await this.findOne(ticketId);
    if (ticket.status === TicketStatus.CLOSED) {
      throw new BadRequestException('Não é possível atribuir um ticket fechado');
    }
    ticket.assigneeId = dto.agentId;
    if (ticket.status === TicketStatus.OPEN) {
      ticket.status = TicketStatus.IN_PROGRESS;
    }
    return this.ticketRepository.save(ticket);
  }

  async addComment(ticketId: string, userId: string, dto: AddCommentDto): Promise<TicketComment> {
    const ticket = await this.findOne(ticketId);
    if (ticket.status === TicketStatus.CLOSED && this.daysSinceClosed(ticket) > 7) {
      throw new BadRequestException(
        'Ticket fechado há mais de 7 dias não pode receber comentários',
      );
    }
    const comment = this.commentRepository.create({
      ticketId,
      userId,
      text: dto.text,
      isInternal: dto.isInternal ?? false,
    });
    return this.commentRepository.save(comment);
  }

  async escalate(ticketId: string): Promise<Ticket> {
    const ticket = await this.findOne(ticketId);
    if (ticket.status === TicketStatus.CLOSED) {
      throw new BadRequestException('Não é possível escalar um ticket fechado');
    }
    ticket.priority = TicketPriority.URGENT;
    const slaHours = DEFAULT_SLA_HOURS[TicketPriority.URGENT];
    ticket.slaDeadline = new Date(Date.now() + slaHours * 3600 * 1000);

    await this.slaRepository.save(
      this.slaRepository.create({
        ticketId: ticket.id,
        priority: TicketPriority.URGENT,
        deadline: ticket.slaDeadline,
      }),
    );

    return this.ticketRepository.save(ticket);
  }

  async close(ticketId: string, userId: string, userRole: string): Promise<Ticket> {
    const ticket = await this.findOne(ticketId);
    const isAgentOrAdmin = userRole === 'admin' || userRole === 'manager';
    const isSubmitter = ticket.submitterId === userId;
    if (!isAgentOrAdmin && !isSubmitter) {
      throw new ForbiddenException('Não tem permissão para fechar este ticket');
    }
    ticket.status = TicketStatus.CLOSED;
    ticket.resolvedAt = new Date();
    return this.ticketRepository.save(ticket);
  }

  async findComments(ticketId: string, includeInternal: boolean): Promise<TicketComment[]> {
    await this.findOne(ticketId);
    return this.commentRepository.find({
      where: includeInternal ? { ticketId } : { ticketId, isInternal: false },
      order: { createdAt: 'ASC' },
    });
  }

  async findCategories(): Promise<TicketCategory[]> {
    return this.categoryRepository.find({ order: { name: 'ASC' } });
  }

  async createCategory(dto: CreateTicketCategoryDto): Promise<TicketCategory> {
    const category = this.categoryRepository.create({
      name: dto.name,
      defaultPriority: dto.defaultPriority ?? TicketPriority.MEDIUM,
      slaHours: dto.slaHours,
      resolutionTeamId: dto.resolutionTeamId ?? null,
    });
    return this.categoryRepository.save(category);
  }

  @Cron('*/30 * * * *')
  async checkSlaBreaches(): Promise<void> {
    const now = new Date();
    const overdue = await this.ticketRepository.find({
      where: {
        slaBreached: false,
        slaDeadline: LessThan(now),
        status: In([TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.PENDING]),
      },
    });

    for (const ticket of overdue) {
      ticket.slaBreached = true;
      await this.ticketRepository.save(ticket);

      await this.slaRepository.save(
        this.slaRepository.create({
          ticketId: ticket.id,
          priority: ticket.priority,
          deadline: ticket.slaDeadline ?? new Date(),
          breached: true,
          notifiedAt: new Date(),
        }),
      );
    }
  }
}
