import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { KeycloakService } from './keycloak.service';
import { User } from '../entities/user.entity';

describe('KeycloakService', () => {
  let service: KeycloakService;
  let mockUserRepo: Record<string, jest.Mock>;
  let fetchMock: jest.Mock;

  beforeEach(async () => {
    mockUserRepo = {
      findOneBy: jest.fn(),
      create: jest.fn((data: Partial<User>) => data),
      save: jest.fn((data: Partial<User>) => Promise.resolve({ id: 'new-user', ...data })),
    };
    fetchMock = jest.fn();
    global.fetch = fetchMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KeycloakService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
              const values: Record<string, string> = {
                KEYCLOAK_BASE_URL: 'http://keycloak.local',
                KEYCLOAK_REALM: 'hr-suite',
                KEYCLOAK_CLIENT_ID: 'srh-backend',
                KEYCLOAK_CLIENT_SECRET: 'secret',
              };
              return values[key] ?? defaultValue;
            }),
          },
        },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
      ],
    }).compile();

    service = module.get<KeycloakService>(KeycloakService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('exchangeCodeForTokens', () => {
    it('deve devolver os tokens quando a resposta é bem-sucedida', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ access_token: 'access-1', refresh_token: 'refresh-1' }),
      });

      const result = await service.exchangeCodeForTokens('code-1', 'http://app/callback');

      expect(fetchMock).toHaveBeenCalledWith(
        'http://keycloak.local/realms/hr-suite/protocol/openid-connect/token',
        expect.objectContaining({ method: 'POST' }),
      );
      expect(result).toEqual({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    });

    it('deve lançar UnauthorizedException se a troca falhar', async () => {
      fetchMock.mockResolvedValue({ ok: false });

      await expect(
        service.exchangeCodeForTokens('bad-code', 'http://app/callback'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getUserInfo', () => {
    it('deve devolver a informação do utilizador quando a resposta é bem-sucedida', async () => {
      const userInfo = { sub: 'kc-1', email: 'joana@bridge351.pt', preferred_username: 'joana' };
      fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve(userInfo) });

      const result = await service.getUserInfo('access-1');

      expect(fetchMock).toHaveBeenCalledWith(
        'http://keycloak.local/realms/hr-suite/protocol/openid-connect/userinfo',
        expect.objectContaining({ headers: { Authorization: 'Bearer access-1' } }),
      );
      expect(result).toEqual(userInfo);
    });

    it('deve lançar UnauthorizedException se a resposta não for bem-sucedida', async () => {
      fetchMock.mockResolvedValue({ ok: false });

      await expect(service.getUserInfo('bad-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('syncUser', () => {
    const keycloakUser = {
      sub: 'kc-1',
      email: 'joana@bridge351.pt',
      preferred_username: 'joana',
    };

    it('deve devolver o utilizador existente se estiver ativo', async () => {
      const existing = { id: 'u-1', email: 'joana@bridge351.pt', isActive: true };
      mockUserRepo.findOneBy.mockResolvedValue(existing);

      const result = await service.syncUser(keycloakUser);

      expect(result).toBe(existing);
      expect(mockUserRepo.save).not.toHaveBeenCalled();
    });

    it('deve lançar UnauthorizedException se o utilizador existente estiver desativado', async () => {
      mockUserRepo.findOneBy.mockResolvedValue({
        id: 'u-1',
        email: 'joana@bridge351.pt',
        isActive: false,
      });

      await expect(service.syncUser(keycloakUser)).rejects.toThrow(UnauthorizedException);
    });

    it('deve criar um novo utilizador quando não existe nenhum com o mesmo email', async () => {
      mockUserRepo.findOneBy.mockResolvedValue(null);

      const result = await service.syncUser(keycloakUser);

      expect(mockUserRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'joana@bridge351.pt',
          username: 'joana',
          isActive: true,
        }),
      );
      expect(result).toEqual(expect.objectContaining({ email: 'joana@bridge351.pt' }));
    });

    it('deve derivar o username do email se preferred_username não for fornecido', async () => {
      mockUserRepo.findOneBy.mockResolvedValue(null);

      await service.syncUser({ sub: 'kc-2', email: 'bruno@bridge351.pt', preferred_username: '' });

      expect(mockUserRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'bruno' }),
      );
    });
  });

  describe('getAuthorizationUrl', () => {
    it('deve construir o URL de autorização com os parâmetros esperados', () => {
      const result = service.getAuthorizationUrl('http://app/callback');

      expect(result).toContain(
        'http://keycloak.local/realms/hr-suite/protocol/openid-connect/auth?',
      );
      expect(result).toContain('client_id=srh-backend');
      expect(result).toContain('redirect_uri=http%3A%2F%2Fapp%2Fcallback');
    });
  });
});
