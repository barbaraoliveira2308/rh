import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { RateLimitStoreService } from './rate-limit-store.service';
import { RedisRateLimitStore } from './redis-rate-limit.store';

describe('RateLimitStoreService (R-061, decisão P107-02)', () => {
  let redisHit: jest.Mock;
  let service: RateLimitStoreService;
  let error: jest.SpyInstance;
  let warn: jest.SpyInstance;
  let log: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    redisHit = jest.fn();
    service = new RateLimitStoreService({ hit: redisHit } as unknown as RedisRateLimitStore);
    error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('deve devolver a contagem do Redis quando está disponível', async () => {
    redisHit.mockResolvedValue(4);

    expect(await service.hit('login:ip', 60, 'memory')).toBe(4);
    expect(service.status()).toBe('redis');
    expect(error).not.toHaveBeenCalled();
  });

  describe("política 'memory'", () => {
    it('deve contar em memória quando o Redis falha ou não responde a tempo', async () => {
      redisHit.mockRejectedValue(new Error('Command timed out'));

      expect(await service.hit('login:ip', 60, 'memory')).toBe(1);
      expect(await service.hit('login:ip', 60, 'memory')).toBe(2);
      expect(service.status()).toBe('memory-fallback');
    });

    it('deve registar RATE_LIMIT_STORE_DEGRADED uma única vez ao entrar no estado degradado', async () => {
      redisHit.mockRejectedValue(new Error('ECONNREFUSED'));

      await service.hit('login:ip', 60, 'memory');
      await service.hit('login:ip', 60, 'memory');
      await service.hit('login:ip', 60, 'memory');

      expect(error).toHaveBeenCalledTimes(1);
      expect(error).toHaveBeenCalledWith('RATE_LIMIT_STORE_DEGRADED ECONNREFUSED');
      expect(warn).not.toHaveBeenCalled();
    });

    it('deve registar RATE_LIMIT_STORE_STILL_DEGRADED no máximo uma vez por minuto', async () => {
      redisHit.mockRejectedValue(new Error('ECONNREFUSED'));

      await service.hit('login:ip', 60, 'memory');
      jest.advanceTimersByTime(59_000);
      await service.hit('login:ip', 60, 'memory');
      expect(warn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1_000);
      await service.hit('login:ip', 60, 'memory');
      await service.hit('login:ip', 60, 'memory');
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith('RATE_LIMIT_STORE_STILL_DEGRADED ECONNREFUSED');

      jest.advanceTimersByTime(60_000);
      await service.hit('login:ip', 60, 'memory');
      expect(warn).toHaveBeenCalledTimes(2);
    });

    it('deve registar RATE_LIMIT_STORE_RECOVERED no primeiro sucesso depois da falha', async () => {
      redisHit.mockRejectedValueOnce(new Error('ECONNREFUSED')).mockResolvedValue(1);

      await service.hit('login:ip', 60, 'memory');
      await service.hit('login:ip', 60, 'memory');
      await service.hit('login:ip', 60, 'memory');

      expect(log).toHaveBeenCalledTimes(1);
      expect(log).toHaveBeenCalledWith('RATE_LIMIT_STORE_RECOVERED');
      expect(service.status()).toBe('redis');
    });

    it('deve descartar as contagens em memória ao recuperar', async () => {
      redisHit
        .mockRejectedValueOnce(new Error('down'))
        .mockRejectedValueOnce(new Error('down'))
        .mockResolvedValueOnce(1)
        .mockRejectedValueOnce(new Error('down'));

      await service.hit('login:ip', 60, 'memory');
      await service.hit('login:ip', 60, 'memory');
      await service.hit('login:ip', 60, 'memory');

      expect(await service.hit('login:ip', 60, 'memory')).toBe(1);
    });
  });

  describe("política 'reject'", () => {
    it('deve responder 503 com uma mensagem genérica quando o Redis falha', async () => {
      redisHit.mockRejectedValue(new Error('Command timed out'));

      const err = (await service
        .hit('reset:ip', 60, 'reject')
        .catch((e: unknown) => e)) as ServiceUnavailableException;

      expect(err).toBeInstanceOf(ServiceUnavailableException);
      expect(err.getStatus()).toBe(503);
      expect(JSON.stringify(err.getResponse())).not.toContain('timed out');
      expect(error).toHaveBeenCalledWith('RATE_LIMIT_STORE_DEGRADED Command timed out');
    });
  });
});
