import { FindOperator, Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import {
  SessionsService,
  SESSION_RETENTION_DAYS,
  activityWriteThrottleSeconds,
} from './sessions.service';
import { Session } from '../entities/session.entity';
import { AdminService } from '../../admin/admin.service';

type Where = Record<string, unknown>;

// Os operadores do TypeORM (IsNull, MoreThan, Raw, Not) são verificados pela forma; o efeito real
// das condições sobre a BD é coberto pelos e2e (test/sessions.e2e-spec.ts).
const operator = (value: unknown): FindOperator<unknown> => value as FindOperator<unknown>;
const rawSql = (value: unknown): string => {
  const op = operator(value);
  return (op.getSql as (column: string) => string)('col');
};

describe('SessionsService (R-061)', () => {
  let repository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    findOneBy: jest.Mock;
    exists: jest.Mock;
    update: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let getSettings: jest.Mock;
  let service: SessionsService;

  beforeEach(() => {
    repository = {
      create: jest.fn((data: Partial<Session>) => data),
      save: jest.fn((data: Partial<Session>) => Promise.resolve({ id: 'session-1', ...data })),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      exists: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn(),
    };
    getSettings = jest.fn().mockResolvedValue({ sessionTimeoutMinutes: 30 });
    service = new SessionsService(
      repository as unknown as Repository<Session>,
      { getSettings } as unknown as AdminService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('create', () => {
    it('deve gravar a sessão com os dois hashes, a validade e os metadados atuais', async () => {
      const expiresAt = new Date('2026-10-13T10:00:00Z');

      const session = await service.create('user-1', 'access-hash', 'refresh-hash', expiresAt, {
        ipAddress: '10.0.0.1',
        userAgent: 'jest',
      });

      expect(repository.create).toHaveBeenCalledWith({
        userId: 'user-1',
        tokenHash: 'access-hash',
        refreshTokenHash: 'refresh-hash',
        ipAddress: '10.0.0.1',
        userAgent: 'jest',
        expiresAt,
      });
      expect(session.id).toBe('session-1');
    });
  });

  describe('validate', () => {
    it('deve devolver a sessão encontrada por uma única query', async () => {
      const row = { id: 'session-1' };
      repository.findOne.mockResolvedValue(row);

      expect(await service.validate('hash-1')).toBe(row);
      expect(repository.findOne).toHaveBeenCalledTimes(1);
    });

    it('deve devolver null quando a linha não existe ou não cumpre a regra de validade', async () => {
      repository.findOne.mockResolvedValue(null);

      expect(await service.validate('hash-1')).toBeNull();
    });

    it('deve exigir o hash, não revogada, não expirada e atividade dentro do timeout', async () => {
      repository.findOne.mockResolvedValue(null);
      const before = Date.now();

      await service.validate('hash-1');

      const { where } = (repository.findOne.mock.calls[0] as unknown[])[0] as { where: Where };
      expect(where.tokenHash).toBe('hash-1');
      expect(operator(where.revokedAt).type).toBe('isNull');
      expect(operator(where.expiresAt).type).toBe('moreThan');
      expect((operator(where.expiresAt).value as Date).getTime()).toBeGreaterThanOrEqual(before);
      expect(rawSql(where.lastActivityAt)).toBe('col > now() - make_interval(mins => :minutes)');
      expect(operator(where.lastActivityAt).objectLiteralParameters).toEqual({ minutes: 30 });
    });

    it('deve reler o timeout da BD no máximo uma vez por minuto', async () => {
      jest.useFakeTimers();
      repository.findOne.mockResolvedValue(null);

      await service.validate('hash-1');
      await service.validate('hash-1');
      expect(getSettings).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(60_001);
      await service.validate('hash-1');
      expect(getSettings).toHaveBeenCalledTimes(2);
    });
  });

  describe('touch', () => {
    it('deve escrever a atividade só quando a última é mais antiga do que o throttle', async () => {
      await service.touch('session-1');

      const [where, values] = repository.update.mock.calls[0] as [Where, Where];
      expect(where.id).toBe('session-1');
      expect(rawSql(where.lastActivityAt)).toBe('col < now() - make_interval(secs => :seconds)');
      expect(operator(where.lastActivityAt).objectLiteralParameters).toEqual({ seconds: 60 });
      expect((values.lastActivityAt as () => string)()).toBe('now()');
    });

    it('deve usar o throttle curto quando o timeout é de 5 minutos ou menos (P107-09)', async () => {
      getSettings.mockResolvedValue({ sessionTimeoutMinutes: 5 });

      await service.touch('session-1');

      const [where] = repository.update.mock.calls[0] as [Where];
      expect(operator(where.lastActivityAt).objectLiteralParameters).toEqual({ seconds: 15 });
    });

    it('deve registar uma falha sem a propagar ao pedido', async () => {
      const error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      repository.update.mockRejectedValue(new Error('db down'));

      await expect(service.touch('session-1')).resolves.toBeUndefined();
      expect(error).toHaveBeenCalledWith(expect.stringContaining('db down'));
    });
  });

  describe('activityWriteThrottleSeconds', () => {
    it.each([
      [1, 15],
      [5, 15],
      [6, 60],
      [30, 60],
    ])('timeout de %i min → %i s', (minutes, seconds) => {
      expect(activityWriteThrottleSeconds(minutes)).toBe(seconds);
    });
  });

  describe('isActive', () => {
    it('deve verificar a atividade da sessão dentro do timeout', async () => {
      repository.exists.mockResolvedValue(true);

      expect(await service.isActive('session-1')).toBe(true);
      const { where } = (repository.exists.mock.calls[0] as unknown[])[0] as { where: Where };
      expect(where.id).toBe('session-1');
      expect(operator(where.lastActivityAt).objectLiteralParameters).toEqual({ minutes: 30 });
    });
  });

  describe('rotate', () => {
    it('deve trocar os hashes só se o refresh token apresentado for o atual', async () => {
      const expiresAt = new Date();

      expect(
        await service.rotate('session-1', 'old-refresh', 'new-access', 'new-refresh', expiresAt),
      ).toBe(true);
      expect(repository.update).toHaveBeenCalledWith(
        { id: 'session-1', refreshTokenHash: 'old-refresh' },
        { tokenHash: 'new-access', refreshTokenHash: 'new-refresh', expiresAt },
      );
    });

    it('deve falhar quando o refresh token já foi rodado', async () => {
      repository.update.mockResolvedValue({ affected: 0 });

      expect(await service.rotate('session-1', 'old', 'a', 'r', new Date())).toBe(false);
    });
  });

  describe('revoke', () => {
    it('deve marcar revoked_at numa sessão ainda não revogada', async () => {
      await service.revoke('session-1');

      const [where, values] = repository.update.mock.calls[0] as [Where, Where];
      expect(where.id).toBe('session-1');
      expect(operator(where.revokedAt).type).toBe('isNull');
      expect(values.revokedAt).toBeInstanceOf(Date);
    });
  });

  describe('revokeAllForUser', () => {
    it('deve revogar todas as sessões ativas do utilizador', async () => {
      await service.revokeAllForUser('user-1');

      const [where, values] = repository.update.mock.calls[0] as [Where, Where];
      expect(where.userId).toBe('user-1');
      expect(operator(where.revokedAt).type).toBe('isNull');
      expect(where.id).toBeUndefined();
      expect(values.revokedAt).toBeInstanceOf(Date);
    });

    it('deve manter a sessão indicada', async () => {
      await service.revokeAllForUser('user-1', 'session-keep');

      const [where] = repository.update.mock.calls[0] as [Where];
      expect(operator(where.id).type).toBe('not');
      expect(operator(where.id).value).toBe('session-keep');
    });
  });

  describe('deleteEnded', () => {
    const queryBuilderReturning = (...affected: number[]): { where: jest.Mock } => {
      const execute = jest.fn();
      for (const value of affected) {
        execute.mockResolvedValueOnce({ affected: value });
      }
      const builder = {
        delete: jest.fn(),
        from: jest.fn(),
        where: jest.fn(),
        execute,
      };
      builder.delete.mockReturnValue(builder);
      builder.from.mockReturnValue(builder);
      builder.where.mockReturnValue(builder);
      repository.createQueryBuilder.mockReturnValue(builder);
      return builder;
    };

    it('deve apagar sessões expiradas, revogadas ou inativas antes do corte de retenção', async () => {
      const builder = queryBuilderReturning(3);
      const before = Date.now();

      expect(await service.deleteEnded(SESSION_RETENTION_DAYS)).toBe(3);

      const [sql, params] = builder.where.mock.calls[0] as [string, Where];
      expect(sql).toContain('expires_at < :cutoff');
      expect(sql).toContain('revoked_at < :cutoff');
      expect(sql).toContain(
        'last_activity_at < now() - make_interval(days => :retentionDays, mins => :idleMinutes)',
      );
      expect(sql).toContain('LIMIT :batchSize');
      expect(params).toMatchObject({ retentionDays: 30, idleMinutes: 30, batchSize: 1000 });
      const cutoff = (params.cutoff as Date).getTime();
      expect(cutoff).toBeLessThanOrEqual(before - 30 * 24 * 60 * 60 * 1000);
      expect(cutoff).toBeGreaterThan(before - 30 * 24 * 60 * 60 * 1000 - 5_000);
    });

    it('deve continuar em lotes até um lote vir incompleto', async () => {
      const builder = queryBuilderReturning(1000, 1000, 7);

      expect(await service.deleteEnded(SESSION_RETENTION_DAYS)).toBe(2007);
      expect(builder.where).toHaveBeenCalledTimes(3);
    });
  });

  describe('runCleanup', () => {
    it('deve registar quantas linhas apagou', async () => {
      const deleteEnded = jest.spyOn(service, 'deleteEnded').mockResolvedValue(12);
      const log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

      await service.runCleanup();

      expect(deleteEnded).toHaveBeenCalledWith(SESSION_RETENTION_DAYS);
      expect(log).toHaveBeenCalledWith('SESSION_CLEANUP deleted=12');
    });

    it('deve registar um erro da BD sem o lançar', async () => {
      jest.spyOn(service, 'deleteEnded').mockRejectedValue(new Error('db down'));
      const error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

      await expect(service.runCleanup()).resolves.toBeUndefined();
      expect(error).toHaveBeenCalledWith(expect.stringContaining('db down'));
    });

    it('deve correr tanto no agendamento diário como depois do arranque', async () => {
      const run = jest.spyOn(service, 'runCleanup').mockResolvedValue();

      await service.cleanupDaily();
      await service.cleanupAfterStart();

      expect(run).toHaveBeenCalledTimes(2);
    });
  });
});
