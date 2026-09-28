import { Injectable } from '@nestjs/common';
import { CacheService } from '../../cache/cache.service';
import { AdminService } from '../../admin/admin.service';

// O timeout vem de SystemSetting e é lido em cada pedido autenticado; relê-se da BD no máximo uma
// vez por minuto (uma alteração em Admin demora até 1 min a aplicar-se).
const SETTINGS_REFRESH_MS = 60_000;

/**
 * BR-AUTH-005: sessões inativas há mais de `sessionTimeoutMinutes` são encerradas. A atividade
 * de cada sessão é uma chave `activity:<sessionId>` na cache, com TTL igual ao timeout e renovada
 * a cada pedido do utilizador — quando expira, a sessão está inativa. Pedidos marcados como
 * automáticos (cabeçalho `X-Background-Request`, usado pelo polling do frontend) validam a
 * sessão mas não a renovam, senão um separador aberto nunca ficaria inativo.
 */
@Injectable()
export class SessionActivityService {
  private timeout: { minutes: number; loadedAt: number } | null = null;

  constructor(
    private readonly cacheService: CacheService,
    private readonly adminService: AdminService,
  ) {}

  async timeoutMinutes(): Promise<number> {
    if (!this.timeout || Date.now() - this.timeout.loadedAt > SETTINGS_REFRESH_MS) {
      const settings = await this.adminService.getSettings();
      this.timeout = { minutes: settings.sessionTimeoutMinutes, loadedAt: Date.now() };
    }
    return this.timeout.minutes;
  }

  async touch(sessionId: string): Promise<void> {
    const minutes = await this.timeoutMinutes();
    await this.cacheService.set(this.activityKey(sessionId), '1', minutes * 60 * 1000);
  }

  isActive(sessionId: string): Promise<boolean> {
    return this.cacheService.exists(this.activityKey(sessionId));
  }

  // Usado pelo JwtAuthGuard em cada pedido. A chave `session:<hash>` guarda o id da sessão.
  async validate(tokenHash: string, countsAsActivity: boolean): Promise<boolean> {
    const sessionKey = `session:${tokenHash}`;
    const sessionId = await this.cacheService.get(sessionKey);
    if (!sessionId) {
      return false;
    }

    if (!(await this.isActive(sessionId))) {
      await this.cacheService.del(sessionKey);
      return false;
    }

    if (countsAsActivity) {
      await this.touch(sessionId);
    }
    return true;
  }

  private activityKey(sessionId: string): string {
    return `activity:${sessionId}`;
  }
}
