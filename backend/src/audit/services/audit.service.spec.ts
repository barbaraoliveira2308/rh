import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditService } from './audit.service';
import { AuditLog } from '../entities/audit-log.entity';

const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

describe('AuditService', () => {
  let service: AuditService;
  let mockAuditLogRepo: Record<string, jest.Mock>;
  let mockQueryBuilder: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockQueryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    mockAuditLogRepo = {
      create: jest.fn((data: Partial<AuditLog>) => data),
      save: jest.fn((data: Partial<AuditLog>) => Promise.resolve(data)),
      find: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: getRepositoryToken(AuditLog), useValue: mockAuditLogRepo },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  describe('log', () => {
    it('deve gravar a entrada com os valores fornecidos', async () => {
      service.log({
        userId: 'user-1',
        action: 'employee.update',
        entityType: 'Employee',
        entityId: 'emp-1',
        module: 'users',
        oldValues: { name: 'Ana' },
        newValues: { name: 'Ana Silva' },
      });

      await flush();

      expect(mockAuditLogRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'employee.update',
          oldValues: { name: 'Ana' },
          newValues: { name: 'Ana Silva' },
        }),
      );
    });

    it('deve mascarar campos sensíveis (password, mfa_secret, nif, token) antes de gravar', async () => {
      service.log({
        action: 'user.update',
        entityType: 'User',
        entityId: 'user-1',
        module: 'auth',
        oldValues: {
          email: 'a@bridge351.pt',
          password_hash: 'abc123',
          mfa_secret: 'xyz',
          nif: '123456789',
          refreshToken: 'rt-1',
        },
      });

      await flush();

      expect(mockAuditLogRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          oldValues: {
            email: 'a@bridge351.pt',
            password_hash: '***',
            mfa_secret: '***',
            nif: '***',
            refreshToken: '***',
          },
        }),
      );
    });

    it('deve processar múltiplas entradas em fila sem se perderem', async () => {
      service.log({ action: 'a.1', entityType: 'A', entityId: '1', module: 'test' });
      service.log({ action: 'a.2', entityType: 'A', entityId: '2', module: 'test' });

      await flush();

      expect(mockAuditLogRepo.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('findAll', () => {
    it('deve aplicar filtros, paginar com cursor e devolver hasMore quando há mais resultados', async () => {
      const now = new Date();
      const results = Array.from({ length: 4 }, (_, i) => ({
        id: `log-${String(i)}`,
        timestamp: new Date(now.getTime() - i * 1000),
      })) as AuditLog[];
      mockQueryBuilder.getMany.mockResolvedValue(results);

      const result = await service.findAll({ userId: 'user-1', limit: 3 });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('log.userId = :userId', {
        userId: 'user-1',
      });
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(4);
      expect(result.data).toHaveLength(3);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe(results[2].timestamp.toISOString());
    });

    it('deve devolver hasMore false e nextCursor null quando não há mais resultados', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.findAll({});

      expect(result.data).toEqual([]);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });
  });

  describe('findByResource', () => {
    it('deve devolver os logs da entidade ordenados por data decrescente', async () => {
      const logs = [{ id: 'log-1' }] as AuditLog[];
      mockAuditLogRepo.find.mockResolvedValue(logs);

      const result = await service.findByResource('Employee', 'emp-1');

      expect(mockAuditLogRepo.find).toHaveBeenCalledWith({
        where: { entityType: 'Employee', entityId: 'emp-1' },
        order: { timestamp: 'DESC' },
      });
      expect(result).toBe(logs);
    });
  });

  describe('findAllForExport', () => {
    it('deve devolver todos os resultados sem limite de paginação', async () => {
      const logs = [{ id: 'log-1' }, { id: 'log-2' }] as AuditLog[];
      mockQueryBuilder.getMany.mockResolvedValue(logs);

      const result = await service.findAllForExport({ entityType: 'Employee' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('log.entityType = :entityType', {
        entityType: 'Employee',
      });
      expect(mockQueryBuilder.take).not.toHaveBeenCalled();
      expect(result).toBe(logs);
    });
  });
});
