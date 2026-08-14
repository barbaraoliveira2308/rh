import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HelpdeskService } from './helpdesk.service';
import { Ticket } from './entities/ticket.entity';
import { TicketComment } from './entities/ticket-comment.entity';
import { TicketSla } from './entities/ticket-sla.entity';
import { TicketCategory } from './entities/ticket-category.entity';
import { TicketStatus } from './entities/ticket-status.enum';
import { TicketPriority } from './entities/ticket-priority.enum';

describe('HelpdeskService', () => {
  let service: HelpdeskService;
  let mockTicketRepo: Record<string, jest.Mock>;
  let mockCommentRepo: Record<string, jest.Mock>;
  let mockSlaRepo: Record<string, jest.Mock>;
  let mockCategoryRepo: Record<string, jest.Mock>;

  const daysAgo = (days: number): Date => new Date(Date.now() - days * 24 * 3600 * 1000);

  beforeEach(async () => {
    mockTicketRepo = {
      findOne: jest.fn(),
      create: jest.fn((data: Partial<Ticket>) => data),
      save: jest.fn((data: Partial<Ticket>) => Promise.resolve(data)),
    };
    mockCommentRepo = {
      create: jest.fn((data: Partial<TicketComment>) => data),
      save: jest.fn((data: Partial<TicketComment>) => Promise.resolve(data)),
    };
    mockSlaRepo = {
      create: jest.fn((data: Partial<TicketSla>) => data),
      save: jest.fn((data: Partial<TicketSla>) => Promise.resolve(data)),
    };
    mockCategoryRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HelpdeskService,
        { provide: getRepositoryToken(Ticket), useValue: mockTicketRepo },
        { provide: getRepositoryToken(TicketComment), useValue: mockCommentRepo },
        { provide: getRepositoryToken(TicketSla), useValue: mockSlaRepo },
        { provide: getRepositoryToken(TicketCategory), useValue: mockCategoryRepo },
      ],
    }).compile();

    service = module.get<HelpdeskService>(HelpdeskService);
  });

  describe('update — BR-HD-004 (reabertura de tickets fechados)', () => {
    it('deve rejeitar alteração de ticket fechado sem tentativa de reabertura', async () => {
      mockTicketRepo.findOne.mockResolvedValue({
        id: 't-1',
        status: TicketStatus.CLOSED,
        resolvedAt: daysAgo(1),
      });

      await expect(service.update('t-1', { title: 'Novo título' })).rejects.toThrow(
        'Não é possível alterar um ticket fechado',
      );
    });

    it('deve reabrir ticket fechado há menos de 7 dias e limpar resolvedAt', async () => {
      mockTicketRepo.findOne.mockResolvedValue({
        id: 't-1',
        status: TicketStatus.CLOSED,
        resolvedAt: daysAgo(3),
        priority: TicketPriority.MEDIUM,
      });

      const result = await service.update('t-1', { status: TicketStatus.IN_PROGRESS });

      expect(result.status).toBe(TicketStatus.IN_PROGRESS);
      expect(result.resolvedAt).toBeNull();
    });

    it('deve rejeitar reabertura de ticket fechado há mais de 7 dias', async () => {
      mockTicketRepo.findOne.mockResolvedValue({
        id: 't-1',
        status: TicketStatus.CLOSED,
        resolvedAt: daysAgo(8),
      });

      await expect(service.update('t-1', { status: TicketStatus.IN_PROGRESS })).rejects.toThrow(
        'Não é possível reabrir um ticket fechado há mais de 7 dias',
      );
    });
  });

  describe('addComment — janela de 7 dias', () => {
    it('deve rejeitar comentário em ticket fechado há mais de 7 dias', async () => {
      mockTicketRepo.findOne.mockResolvedValue({
        id: 't-1',
        status: TicketStatus.CLOSED,
        resolvedAt: daysAgo(10),
      });

      await expect(
        service.addComment('t-1', 'user-1', { text: 'Comentário tardio' }),
      ).rejects.toThrow('Ticket fechado há mais de 7 dias não pode receber comentários');
    });

    it('deve permitir comentário em ticket fechado há menos de 7 dias', async () => {
      mockTicketRepo.findOne.mockResolvedValue({
        id: 't-1',
        status: TicketStatus.CLOSED,
        resolvedAt: daysAgo(2),
      });

      const result = await service.addComment('t-1', 'user-1', { text: 'Ainda em prazo' });
      expect(result.text).toBe('Ainda em prazo');
    });
  });
});
