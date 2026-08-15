import Redis from 'ioredis';
import { RedisCacheService } from './redis-cache.service';

const mockGet = jest.fn();
const mockSet = jest.fn();
const mockDel = jest.fn();
const mockExists = jest.fn();
const mockConnect = jest.fn();
const mockDisconnect = jest.fn();
const mockOn = jest.fn();

jest.mock('ioredis', () => {
  const mockRedis = jest.fn().mockImplementation(() => ({
    get: mockGet,
    set: mockSet,
    del: mockDel,
    exists: mockExists,
    connect: mockConnect,
    disconnect: mockDisconnect,
    on: mockOn,
    status: 'wait',
  }));
  return { __esModule: true, default: mockRedis };
});

describe('RedisCacheService', () => {
  let service: RedisCacheService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RedisCacheService();
  });

  it('deve criar o cliente ioredis com ligação preguiçosa (lazyConnect)', () => {
    expect(Redis).toHaveBeenCalledWith(expect.objectContaining({ lazyConnect: true }));
    expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function));
  });

  describe('get', () => {
    it('deve devolver o valor desserializado quando existe', async () => {
      mockGet.mockResolvedValue(JSON.stringify({ a: 1 }));

      const result = await service.get('key-1');

      expect(result).toEqual({ a: 1 });
    });

    it('deve devolver null quando a chave não existe', async () => {
      mockGet.mockResolvedValue(null);

      const result = await service.get('missing');

      expect(result).toBeNull();
    });

    it('deve devolver null se o cliente Redis lançar um erro', async () => {
      mockGet.mockRejectedValue(new Error('connection refused'));

      const result = await service.get('key-1');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('deve serializar o valor e definir o TTL em segundos', async () => {
      await service.set('key-1', { a: 1 }, 120);

      expect(mockSet).toHaveBeenCalledWith('key-1', JSON.stringify({ a: 1 }), 'EX', 120);
    });

    it('não deve lançar erro se o cliente Redis falhar ao escrever', async () => {
      mockSet.mockRejectedValue(new Error('connection refused'));

      await expect(service.set('key-1', { a: 1 }, 120)).resolves.toBeUndefined();
    });
  });

  describe('del', () => {
    it('deve chamar del no cliente Redis', async () => {
      await service.del('key-1');

      expect(mockDel).toHaveBeenCalledWith('key-1');
    });

    it('não deve lançar erro se o cliente Redis falhar ao remover', async () => {
      mockDel.mockRejectedValue(new Error('connection refused'));

      await expect(service.del('key-1')).resolves.toBeUndefined();
    });
  });

  describe('exists', () => {
    it('deve devolver true quando o Redis reporta 1', async () => {
      mockExists.mockResolvedValue(1);

      expect(await service.exists('key-1')).toBe(true);
    });

    it('deve devolver false quando o Redis reporta 0', async () => {
      mockExists.mockResolvedValue(0);

      expect(await service.exists('key-1')).toBe(false);
    });

    it('deve devolver false se o cliente Redis lançar um erro', async () => {
      mockExists.mockRejectedValue(new Error('connection refused'));

      expect(await service.exists('key-1')).toBe(false);
    });
  });

  describe('connect', () => {
    it('deve ligar-se quando o estado não é ready nem connect', async () => {
      await service.connect();

      expect(mockConnect).toHaveBeenCalled();
    });

    it('não deve tentar ligar-se novamente se já estiver ready', async () => {
      (service as unknown as { client: { status: string } }).client.status = 'ready';

      await service.connect();

      expect(mockConnect).not.toHaveBeenCalled();
    });

    it('não deve lançar erro se a ligação falhar', async () => {
      mockConnect.mockRejectedValue(new Error('connection refused'));

      await expect(service.connect()).resolves.toBeUndefined();
    });
  });

  describe('onModuleDestroy', () => {
    it('deve desligar o cliente Redis', () => {
      service.onModuleDestroy();

      expect(mockDisconnect).toHaveBeenCalled();
    });
  });
});
