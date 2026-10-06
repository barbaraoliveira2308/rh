import Redis from 'ioredis';
import { RedisRateLimitStore } from './redis-rate-limit.store';

const mockEval = jest.fn();
const mockConnect = jest.fn();
const mockDisconnect = jest.fn();
const mockOn = jest.fn();

jest.mock('ioredis', () => {
  const mockRedis = jest.fn().mockImplementation(() => ({
    eval: mockEval,
    connect: mockConnect,
    disconnect: mockDisconnect,
    on: mockOn,
  }));
  return { __esModule: true, default: mockRedis };
});

describe('RedisRateLimitStore (R-061)', () => {
  let store: RedisRateLimitStore;

  beforeEach(() => {
    jest.clearAllMocks();
    store = new RedisRateLimitStore('ratelimit:');
  });

  it('deve falhar depressa: timeout de 300 ms e sem fila de comandos offline', () => {
    expect(Redis).toHaveBeenCalledWith(
      expect.objectContaining({ commandTimeout: 300, enableOfflineQueue: false }),
    );
    expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('deve incrementar a chave com prefixo e definir o TTL igual à janela no mesmo script', async () => {
    mockEval.mockResolvedValueOnce(1).mockResolvedValueOnce(2);

    expect(await store.hit('login:10.0.0.1', 60)).toBe(1);
    expect(await store.hit('login:10.0.0.1', 60)).toBe(2);

    const [script, numKeys, key, ttl] = mockEval.mock.calls[0] as [string, number, string, number];
    expect(script).toContain("redis.call('INCR', KEYS[1])");
    expect(script).toContain("redis.call('EXPIRE', KEYS[1], ARGV[1])");
    expect(numKeys).toBe(1);
    expect(key).toBe('ratelimit:login:10.0.0.1');
    expect(ttl).toBe(60);
  });

  it('deve propagar os erros do Redis para quem decide a política', async () => {
    mockEval.mockRejectedValue(new Error('Command timed out'));

    await expect(store.hit('login:10.0.0.1', 60)).rejects.toThrow('Command timed out');
  });

  it('não deve impedir o arranque se o Redis estiver em baixo', async () => {
    mockConnect.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(store.onModuleInit()).resolves.toBeUndefined();
  });

  it('deve fechar a ligação no fim do módulo', () => {
    store.onModuleDestroy();

    expect(mockDisconnect).toHaveBeenCalled();
  });
});
