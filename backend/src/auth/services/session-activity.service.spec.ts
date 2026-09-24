import { SessionActivityService } from './session-activity.service';
import { CacheService } from '../../cache/cache.service';
import { AdminService } from '../../admin/admin.service';

describe('SessionActivityService (BR-AUTH-005)', () => {
  let cache: CacheService;
  let getSettings: jest.Mock;
  let service: SessionActivityService;

  beforeEach(() => {
    jest.useFakeTimers();
    cache = new CacheService();
    getSettings = jest.fn().mockResolvedValue({ sessionTimeoutMinutes: 30 });
    service = new SessionActivityService(cache, { getSettings } as unknown as AdminService);
  });

  afterEach(() => {
    cache.onModuleDestroy();
    jest.useRealTimers();
  });

  // A chave de sessão dura aqui 2 h para isolar o timeout de inatividade; na aplicação dura 15 min
  // (a vida do access token) e é recriada em cada refresh.
  const startSession = async (): Promise<void> => {
    await cache.set('session:hash-1', 'session-1', 2 * 60 * 60 * 1000);
    await service.touch('session-1');
  };

  it('deve aceitar uma sessão com atividade dentro do timeout', async () => {
    await startSession();

    expect(await service.validate('hash-1', true)).toBe(true);
  });

  it('deve recusar a sessão e apagar a chave depois do timeout sem atividade', async () => {
    await startSession();
    jest.advanceTimersByTime(30 * 60 * 1000 + 1);

    expect(await service.validate('hash-1', true)).toBe(false);
    expect(await cache.exists('session:hash-1')).toBe(false);
  });

  it('deve renovar o timeout a cada pedido do utilizador (deslizante)', async () => {
    await startSession();
    jest.advanceTimersByTime(20 * 60 * 1000);
    await service.validate('hash-1', true);
    jest.advanceTimersByTime(20 * 60 * 1000);

    expect(await service.isActive('session-1')).toBe(true);
  });

  it('não deve renovar o timeout com pedidos automáticos (polling)', async () => {
    await startSession();
    jest.advanceTimersByTime(20 * 60 * 1000);
    expect(await service.validate('hash-1', false)).toBe(true);
    jest.advanceTimersByTime(20 * 60 * 1000);

    expect(await service.validate('hash-1', false)).toBe(false);
  });

  it('deve usar sessionTimeoutMinutes e reler a configuração no máximo uma vez por minuto', async () => {
    getSettings.mockResolvedValue({ sessionTimeoutMinutes: 5 });
    await startSession();
    await service.touch('session-1');
    expect(getSettings).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(5 * 60 * 1000 + 1);
    expect(await service.isActive('session-1')).toBe(false);
    await service.timeoutMinutes();
    expect(getSettings).toHaveBeenCalledTimes(2);
  });
});
