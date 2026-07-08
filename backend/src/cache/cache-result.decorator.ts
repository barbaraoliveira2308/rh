import { RedisCacheService } from './redis-cache.service';

const DEFAULT_TTL_SECONDS = 300;

function buildKey(target: unknown, propertyKey: string | symbol, args: unknown[]): string {
  const className = target instanceof Object ? target.constructor.name : 'Unknown';
  const argsHash = JSON.stringify(args);
  return className + ':' + String(propertyKey) + ':' + argsHash;
}

export function CacheResult(ttlSeconds = DEFAULT_TTL_SECONDS): MethodDecorator {
  return function (
    _target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value as (
      this: unknown,
      ...args: unknown[]
    ) => Promise<unknown>;

    descriptor.value = async function (
      this: { redisCacheService?: RedisCacheService },
      ...args: unknown[]
    ): Promise<unknown> {
      const redisCache = this.redisCacheService;

      if (!redisCache) {
        return originalMethod.apply(this, args);
      }

      const key = buildKey(this, propertyKey, args);
      const cached = await redisCache.get(key);

      if (cached !== null) {
        return cached;
      }

      const result = await originalMethod.apply(this, args);
      await redisCache.set(key, result, ttlSeconds);

      return result;
    } as typeof originalMethod;

    return descriptor;
  };
}
