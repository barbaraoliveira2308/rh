import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression, Timeout } from '@nestjs/schedule';
import { IsNull, MoreThan, Not, Raw, Repository } from 'typeorm';
import { Session } from '../entities/session.entity';
import { AdminService } from '../../admin/admin.service';
import { SessionValidator } from '../guards/jwt-auth.guard';

// O timeout vem de SystemSetting e é lido em cada pedido autenticado; relê-se da BD no máximo uma
// vez por minuto (uma alteração em Admin demora até 1 min a aplicar-se).
const SETTINGS_REFRESH_MS = 60_000;

// Escrever `last_activity_at` em cada pedido seria um UPDATE por pedido; com o throttle, o timeout
// fica até este número de segundos menos preciso. Com um timeout curto (≤ 5 min) usa-se o valor
// menor, decidido em cada pedido porque o timeout muda em Admin sem reinício (decisão P107-09).
export const ACTIVITY_WRITE_THROTTLE_SECONDS = 60;
export const SHORT_TIMEOUT_ACTIVITY_WRITE_THROTTLE_SECONDS = 15;
const SHORT_TIMEOUT_MAX_MINUTES = 5;

// Decisão P107-04: as linhas de sessões terminadas apagam-se 30 dias depois do fim. O mínimo é a
// validade do refresh token (~7 dias); o resto serve só para investigar incidentes (RGPD).
export const SESSION_RETENTION_DAYS = 30;
const CLEANUP_BATCH_SIZE = 1000;
const CLEANUP_AFTER_START_MS = 60_000;

export interface SessionMetadata {
  ipAddress: string;
  userAgent: string | null;
}

export function activityWriteThrottleSeconds(timeoutMinutes: number): number {
  return timeoutMinutes <= SHORT_TIMEOUT_MAX_MINUTES
    ? SHORT_TIMEOUT_ACTIVITY_WRITE_THROTTLE_SECONDS
    : ACTIVITY_WRITE_THROTTLE_SECONDS;
}

/**
 * R-061 (P-107): única dona do estado das sessões, guardado em `hr.sessions` (decisão P107-01).
 * Uma sessão é válida se a linha existe, não foi revogada, não expirou e teve atividade dentro do
 * timeout por inatividade (BR-AUTH-005). Pedidos marcados como automáticos (cabeçalho
 * `X-Background-Request`, usado pelo polling do frontend) validam a sessão mas não a renovam,
 * senão um separador aberto nunca ficaria inativo — essa escolha é do JwtAuthGuard.
 */
@Injectable()
export class SessionsService implements SessionValidator {
  private readonly logger = new Logger(SessionsService.name);
  private timeout: { minutes: number; loadedAt: number } | null = null;

  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    private readonly adminService: AdminService,
  ) {}

  async timeoutMinutes(): Promise<number> {
    if (!this.timeout || Date.now() - this.timeout.loadedAt > SETTINGS_REFRESH_MS) {
      const settings = await this.adminService.getSettings();
      this.timeout = { minutes: settings.sessionTimeoutMinutes, loadedAt: Date.now() };
    }
    return this.timeout.minutes;
  }

  async create(
    userId: string,
    tokenHash: string,
    refreshTokenHash: string,
    expiresAt: Date,
    metadata: SessionMetadata,
  ): Promise<Session> {
    const session = this.sessionRepository.create({
      userId,
      tokenHash,
      refreshTokenHash,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      expiresAt,
    });
    // `last_activity_at` fica com o DEFAULT now() da coluna.
    return this.sessionRepository.save(session);
  }

  // Usado pelo JwtAuthGuard em cada pedido: uma única query pelo índice único de `token_hash`.
  async validate(tokenHash: string): Promise<Session | null> {
    const minutes = await this.timeoutMinutes();
    return this.sessionRepository.findOne({
      where: {
        tokenHash,
        revokedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
        lastActivityAt: Raw((column) => `${column} > now() - make_interval(mins => :minutes)`, {
          minutes,
        }),
      },
    });
  }

  // Nunca falha o pedido: um erro só fica registado e a atividade é escrita no pedido seguinte.
  async touch(sessionId: string): Promise<void> {
    try {
      const seconds = activityWriteThrottleSeconds(await this.timeoutMinutes());
      await this.sessionRepository.update(
        {
          id: sessionId,
          lastActivityAt: Raw((column) => `${column} < now() - make_interval(secs => :seconds)`, {
            seconds,
          }),
        },
        { lastActivityAt: () => 'now()' },
      );
    } catch (err) {
      this.logger.error(
        `Falha ao registar a atividade da sessão ${sessionId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async isActive(sessionId: string): Promise<boolean> {
    const minutes = await this.timeoutMinutes();
    return this.sessionRepository.exists({
      where: {
        id: sessionId,
        lastActivityAt: Raw((column) => `${column} > now() - make_interval(mins => :minutes)`, {
          minutes,
        }),
      },
    });
  }

  findByTokenHash(tokenHash: string): Promise<Session | null> {
    return this.sessionRepository.findOneBy({ tokenHash });
  }

  findByRefreshTokenHash(refreshTokenHash: string): Promise<Session | null> {
    return this.sessionRepository.findOneBy({ refreshTokenHash });
  }

  // Troca o par de tokens da sessão só se o refresh token apresentado ainda for o atual: dois
  // refreshes simultâneos com o mesmo token não podem ambos ter sucesso.
  async rotate(
    sessionId: string,
    oldRefreshTokenHash: string,
    tokenHash: string,
    refreshTokenHash: string,
    expiresAt: Date,
  ): Promise<boolean> {
    const result = await this.sessionRepository.update(
      { id: sessionId, refreshTokenHash: oldRefreshTokenHash },
      { tokenHash, refreshTokenHash, expiresAt },
    );
    return (result.affected ?? 0) > 0;
  }

  async revoke(sessionId: string): Promise<void> {
    await this.sessionRepository.update(
      { id: sessionId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async revokeAllForUser(userId: string, exceptSessionId?: string): Promise<void> {
    await this.sessionRepository.update(
      {
        userId,
        revokedAt: IsNull(),
        ...(exceptSessionId ? { id: Not(exceptSessionId) } : {}),
      },
      { revokedAt: new Date() },
    );
  }

  // Decisão P107-04: apaga as linhas de sessões que terminaram (expiradas, revogadas ou inativas)
  // há mais de `retentionDays`, em lotes, para não prender a tabela que todos os pedidos leem.
  async deleteEnded(retentionDays: number): Promise<number> {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const idleMinutes = await this.timeoutMinutes();
    let deleted = 0;

    for (;;) {
      const result = await this.sessionRepository
        .createQueryBuilder()
        .delete()
        .from(Session)
        .where(
          `id IN (
            SELECT id FROM hr.sessions
            WHERE expires_at < :cutoff
               OR revoked_at < :cutoff
               OR last_activity_at < now() - make_interval(days => :retentionDays, mins => :idleMinutes)
            LIMIT :batchSize
          )`,
          { cutoff, retentionDays, idleMinutes, batchSize: CLEANUP_BATCH_SIZE },
        )
        .execute();
      const affected = result.affected ?? 0;
      deleted += affected;
      if (affected < CLEANUP_BATCH_SIZE) {
        return deleted;
      }
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupDaily(): Promise<void> {
    await this.runCleanup();
  }

  // Também pouco depois do arranque, sem atrasar o boot. Com várias instâncias todas correm a
  // limpeza; o DELETE é idempotente, por isso não há locking.
  @Timeout(CLEANUP_AFTER_START_MS)
  async cleanupAfterStart(): Promise<void> {
    await this.runCleanup();
  }

  async runCleanup(): Promise<void> {
    try {
      const deleted = await this.deleteEnded(SESSION_RETENTION_DAYS);
      this.logger.log(`SESSION_CLEANUP deleted=${String(deleted)}`);
    } catch (err) {
      this.logger.error(
        `SESSION_CLEANUP falhou: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
