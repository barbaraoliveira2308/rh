import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { RATE_LIMIT_KEY_PREFIX, RateLimitStore } from './rate-limit-store';

// INCR e EXPIRE no mesmo script: atómico, e nenhuma chave fica sem TTL. O TTL só é definido no
// primeiro pedido, pelo que a janela é fixa e começa nesse pedido, como na contagem em memória.
const HIT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return count
`;

// Um login não pode ficar à espera de um Redis em baixo: os comandos falham ao fim de 300 ms e
// não ficam em fila enquanto não houver ligação.
const COMMAND_TIMEOUT_MS = 300;

/**
 * Ligação própria ao Redis, com as mesmas variáveis de ambiente do RedisCacheService (Analytics).
 * Não reutiliza esse cliente porque ele guarda comandos em fila sem timeout e esconde todos os
 * erros — aqui é preciso falhar depressa e saber que falhou, para cair para a memória.
 */
@Injectable()
export class RedisRateLimitStore implements RateLimitStore, OnModuleInit, OnModuleDestroy {
  private readonly client: Redis;

  constructor(@Inject(RATE_LIMIT_KEY_PREFIX) private readonly keyPrefix: string) {
    this.client = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
      lazyConnect: true,
      commandTimeout: COMMAND_TIMEOUT_MS,
      enableOfflineQueue: false,
      retryStrategy: (times: number): number => Math.min(times * 50, 2000),
    });

    // Sem ouvinte, o ioredis escreve cada erro de ligação na consola. As falhas chegam aos
    // comandos e o RateLimitStoreService regista-as, com limite de frequência.
    this.client.on('error', (): void => undefined);
  }

  // Liga no arranque para o primeiro login não cair para a memória; se o Redis estiver em baixo,
  // o arranque continua e o cliente volta a tentar em segundo plano.
  async onModuleInit(): Promise<void> {
    await this.client.connect().catch((): void => undefined);
  }

  async hit(key: string, windowSeconds: number): Promise<number> {
    const count = await this.client.eval(HIT_SCRIPT, 1, `${this.keyPrefix}${key}`, windowSeconds);
    return Number(count);
  }

  onModuleDestroy(): void {
    this.client.disconnect();
  }
}
