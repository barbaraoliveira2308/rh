import { CacheService } from './cache.service';

describe('CacheService', () => {
  let service: CacheService;

  beforeEach(() => {
    service = new CacheService();
  });

  afterEach(() => {
    service.onModuleDestroy();
    jest.restoreAllMocks();
  });

  describe('get/set', () => {
    it('deve devolver null para uma chave inexistente', async () => {
      const result = await service.get('missing');

      expect(result).toBeNull();
    });

    it('deve guardar e devolver um valor dentro do TTL', async () => {
      await service.set('key-1', 'value-1', 60_000);

      const result = await service.get('key-1');

      expect(result).toBe('value-1');
    });

    it('deve devolver null e remover a entrada após o TTL expirar', async () => {
      const nowSpy = jest.spyOn(Date, 'now');
      nowSpy.mockReturnValue(1_000);
      await service.set('key-1', 'value-1', 1_000);

      nowSpy.mockReturnValue(3_000);
      const result = await service.get('key-1');

      expect(result).toBeNull();
    });
  });

  describe('del', () => {
    it('deve remover uma chave existente', async () => {
      await service.set('key-1', 'value-1', 60_000);

      await service.del('key-1');

      expect(await service.get('key-1')).toBeNull();
    });
  });

  describe('exists', () => {
    it('deve devolver true se a chave existir e não tiver expirado', async () => {
      await service.set('key-1', 'value-1', 60_000);

      expect(await service.exists('key-1')).toBe(true);
    });

    it('deve devolver false se a chave não existir', async () => {
      expect(await service.exists('missing')).toBe(false);
    });
  });
});
