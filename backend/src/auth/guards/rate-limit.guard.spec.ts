import {
  ExecutionContext,
  HttpException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitGuard } from './rate-limit.guard';
import { RateLimitStoreService } from '../rate-limit/rate-limit-store.service';
import { RedisRateLimitStore } from '../rate-limit/redis-rate-limit.store';
import { RATE_LIMIT_ON_STORE_UNAVAILABLE_KEY } from '../decorators/rate-limit-on-store-unavailable.decorator';

// Redis falso com a mesma semântica do script: INCR e TTL definido só no primeiro pedido.
class FakeRedisStore {
  readonly keys = new Map<string, { count: number; ttl: number }>();
  failing = false;

  hit(key: string, windowSeconds: number): Promise<number> {
    if (this.failing) {
      return Promise.reject(new Error('Command timed out'));
    }
    const entry = this.keys.get(key) ?? { count: 0, ttl: windowSeconds };
    entry.count++;
    this.keys.set(key, entry);
    return Promise.resolve(entry.count);
  }
}

describe('RateLimitGuard (R-061)', () => {
  let redis: FakeRedisStore;
  let reflector: Reflector;
  let guard: RateLimitGuard;

  const contextFor = (ip: string, handler: () => void = () => undefined): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ ip }) }),
      getHandler: () => handler,
      getClass: () => RateLimitGuard,
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    redis = new FakeRedisStore();
    reflector = new Reflector();
    guard = new RateLimitGuard(
      new RateLimitStoreService(redis as unknown as RedisRateLimitStore),
      reflector,
    );
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deve contar por IP numa chave do login com TTL igual à janela de 60 s', async () => {
    await guard.canActivate(contextFor('10.0.0.1'));
    await guard.canActivate(contextFor('10.0.0.1'));

    expect(redis.keys.get('login:10.0.0.1')).toEqual({ count: 2, ttl: 60 });
  });

  it('deve deixar passar 10 pedidos e recusar o 11.º com a resposta de hoje (429)', async () => {
    for (let i = 0; i < 10; i++) {
      await expect(guard.canActivate(contextFor('10.0.0.1'))).resolves.toBe(true);
    }

    const err = (await guard
      .canActivate(contextFor('10.0.0.1'))
      .catch((e: unknown) => e)) as HttpException;

    expect(err).toBeInstanceOf(HttpException);
    expect(err.getStatus()).toBe(429);
    expect(err.getResponse()).toBe('Demasiados pedidos. Tente novamente mais tarde.');
    // Outro IP tem o seu próprio contador.
    await expect(guard.canActivate(contextFor('10.0.0.2'))).resolves.toBe(true);
  });

  it("deve usar a política 'memory' por omissão quando o Redis falha", async () => {
    redis.failing = true;

    await expect(guard.canActivate(contextFor('10.0.0.1'))).resolves.toBe(true);
  });

  it("deve responder 503 numa rota com a política 'reject' quando o Redis falha", async () => {
    const handler = (): void => undefined;
    Reflect.defineMetadata(RATE_LIMIT_ON_STORE_UNAVAILABLE_KEY, 'reject', handler);
    redis.failing = true;

    await expect(guard.canActivate(contextFor('10.0.0.1', handler))).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
