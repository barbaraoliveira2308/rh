import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { MemoryRateLimitStore } from './memory-rate-limit.store';
import { RedisRateLimitStore } from './redis-rate-limit.store';
import { RateLimitStorePolicy } from './rate-limit-store';

const STILL_DEGRADED_LOG_INTERVAL_MS = 60_000;

export type RateLimitStoreStatus = 'redis' | 'memory-fallback';

/**
 * R-061 (P-107): contadores do rate limit no Redis, partilhados entre instâncias e reinícios.
 * Se o Redis falhar, cada rota segue a sua política (decisão P107-02) e a degradação fica
 * visível: um `error` ao entrar, no máximo um `warn` por minuto enquanto dura, e um `log` na
 * recuperação. As contagens feitas em memória durante a falha descartam-se ao recuperar.
 */
@Injectable()
export class RateLimitStoreService {
  private readonly logger = new Logger(RateLimitStoreService.name);
  private readonly memory = new MemoryRateLimitStore();
  private degraded = false;
  private lastDegradedLogAt = 0;

  constructor(private readonly redis: RedisRateLimitStore) {}

  async hit(
    key: string,
    windowSeconds: number,
    onStoreUnavailable: RateLimitStorePolicy,
  ): Promise<number> {
    let count: number;
    try {
      count = await this.redis.hit(key, windowSeconds);
    } catch (err) {
      this.reportFailure(err);
      if (onStoreUnavailable === 'reject') {
        throw new ServiceUnavailableException(
          'Serviço temporariamente indisponível. Tente novamente mais tarde.',
        );
      }
      return this.memory.hit(key, windowSeconds);
    }

    this.reportSuccess();
    return count;
  }

  status(): RateLimitStoreStatus {
    return this.degraded ? 'memory-fallback' : 'redis';
  }

  private reportFailure(err: unknown): void {
    const cause = err instanceof Error ? err.message : String(err);
    const now = Date.now();

    if (!this.degraded) {
      this.degraded = true;
      this.lastDegradedLogAt = now;
      this.logger.error(`RATE_LIMIT_STORE_DEGRADED ${cause}`);
      return;
    }

    if (now - this.lastDegradedLogAt >= STILL_DEGRADED_LOG_INTERVAL_MS) {
      this.lastDegradedLogAt = now;
      this.logger.warn(`RATE_LIMIT_STORE_STILL_DEGRADED ${cause}`);
    }
  }

  private reportSuccess(): void {
    if (!this.degraded) {
      return;
    }
    this.degraded = false;
    this.memory.clear();
    this.logger.log('RATE_LIMIT_STORE_RECOVERED');
  }
}
