import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { JwtService } from './jwt.service';
import { MfaService } from './mfa.service';
import { CacheService } from '../../cache/cache.service';
import { AdminService } from '../../admin/admin.service';
import { User } from '../entities/user.entity';
import { Session } from '../entities/session.entity';
import { UserRole } from '../entities/user-role.entity';

jest.mock('argon2');

describe('AuthService', () => {
  let service: AuthService;
  let mockUserRepo: Record<string, jest.Mock>;
  let mockSessionRepo: Record<string, jest.Mock>;
  let mockUserRoleRepo: Record<string, jest.Mock>;
  let mockJwtService: Record<string, jest.Mock>;
  let mockMfaService: Record<string, jest.Mock>;
  let mockCacheService: Record<string, jest.Mock>;
  let mockConfigService: Record<string, jest.Mock>;
  let mockAdminService: Record<string, jest.Mock>;

  const testEmail = 'joana@bridge351.pt';

  const baseUser: Partial<User> = {
    id: 'user-1',
    email: testEmail,
    username: 'joana',
    passwordHash: 'hashed',
    isActive: true,
    mfaEnabled: false,
    mfaSecret: null,
    failedLoginCount: 0,
    lockedUntil: null,
    passwordChangedAt: new Date(),
  };

  beforeEach(async () => {
    mockUserRepo = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      update: jest.fn(),
    };
    mockSessionRepo = {
      create: jest.fn((data: Partial<Session>) => data),
      save: jest.fn((data: Partial<Session>) => Promise.resolve({ id: 'session-1', ...data })),
      update: jest.fn(),
    };
    mockUserRoleRepo = {
      find: jest.fn().mockResolvedValue([]),
    };
    mockJwtService = {
      generateTokenPair: jest.fn().mockReturnValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      }),
      generateAccessToken: jest.fn().mockReturnValue('new-access-token'),
      generateRefreshToken: jest.fn().mockReturnValue('new-refresh-token'),
      computeTokenHash: jest.fn((token: string) => `hash(${token})`),
      verifyRefreshToken: jest.fn().mockReturnValue({ sub: 'user-1', jti: 'jti-1' }),
    };
    mockMfaService = {
      validateToken: jest.fn(),
      generateSecret: jest.fn(),
    };
    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };
    mockConfigService = {
      get: jest.fn().mockReturnValue('http://localhost:3000'),
    };
    mockAdminService = {
      getSettings: jest.fn().mockResolvedValue({ maxLoginAttempts: 5, lockoutPeriodMinutes: 15 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(Session), useValue: mockSessionRepo },
        { provide: getRepositoryToken(UserRole), useValue: mockUserRoleRepo },
        { provide: JwtService, useValue: mockJwtService },
        { provide: MfaService, useValue: mockMfaService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AdminService, useValue: mockAdminService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
    (argon2.verify as jest.Mock).mockResolvedValue(true);
    (argon2.hash as jest.Mock).mockResolvedValue('new-hash');
  });

  describe('login', () => {
    it('deve lançar UnauthorizedException se o utilizador não existir', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(service.login('missing@bridge351.pt', 'secret')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('deve lançar ForbiddenException se a conta estiver desativada', async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser, isActive: false });

      await expect(service.login(testEmail, 'secret')).rejects.toThrow(ForbiddenException);
    });

    it('deve lançar ForbiddenException se a conta estiver bloqueada', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        ...baseUser,
        lockedUntil: new Date(Date.now() + 60_000),
      });

      await expect(service.login(testEmail, 'secret')).rejects.toThrow(ForbiddenException);
    });

    it('deve incrementar failedLoginCount e lançar UnauthorizedException se a password for inválida', async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser, failedLoginCount: 2 });
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(service.login(testEmail, 'wrong')).rejects.toThrow(UnauthorizedException);

      expect(mockUserRepo.update).toHaveBeenCalledWith('user-1', { failedLoginCount: 3 });
    });

    it('deve bloquear a conta ao atingir o número máximo de tentativas falhadas', async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser, failedLoginCount: 4 });
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(service.login(testEmail, 'wrong')).rejects.toThrow(UnauthorizedException);

      expect(mockUserRepo.update).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ failedLoginCount: 5, lockedUntil: expect.any(Date) as Date }),
      );
    });

    it('deve exigir código MFA quando MFA está ativo e não for fornecido', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        ...baseUser,
        mfaEnabled: true,
        mfaSecret: 'secret',
      });

      await expect(service.login(testEmail, 'secret')).rejects.toThrow(BadRequestException);
    });

    it('deve lançar UnauthorizedException se o código MFA for inválido', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        ...baseUser,
        mfaEnabled: true,
        mfaSecret: 'secret',
      });
      mockMfaService.validateToken.mockReturnValue(false);

      await expect(service.login(testEmail, 'secret', '000000')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('deve autenticar com sucesso, criar sessão e devolver tokens', async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser });
      mockUserRoleRepo.find.mockResolvedValue([{ role: { name: 'employee' } }]);

      const result = await service.login(testEmail, 'secret', undefined, '127.0.0.1');

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.user).toEqual({
        id: 'user-1',
        email: baseUser.email,
        username: baseUser.username,
        roles: ['employee'],
      });
      expect(mockUserRepo.update).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ failedLoginCount: 0, lockedUntil: null }),
      );
      expect(mockSessionRepo.save).toHaveBeenCalled();
      expect(mockCacheService.set).toHaveBeenCalledTimes(2);
    });
  });

  describe('logout', () => {
    it('deve remover a sessão da cache e marcar como revogada', async () => {
      await service.logout('hash-1');

      expect(mockCacheService.del).toHaveBeenCalledWith('session:hash-1');
      expect(mockSessionRepo.update).toHaveBeenCalledWith(
        { tokenHash: 'hash-1' },
        { revokedAt: expect.any(Date) as Date },
      );
    });
  });

  describe('refresh', () => {
    it('deve lançar UnauthorizedException se o refresh token não estiver na cache', async () => {
      mockCacheService.get.mockResolvedValue(null);

      await expect(service.refresh('refresh-token')).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException se o utilizador estiver inativo', async () => {
      mockCacheService.get.mockResolvedValue(
        JSON.stringify({ userId: 'user-1', sessionId: 'session-1' }),
      );
      mockUserRepo.findOneBy.mockResolvedValue({ ...baseUser, isActive: false });

      await expect(service.refresh('refresh-token')).rejects.toThrow(UnauthorizedException);
    });

    it('deve gerar novos tokens e atualizar a sessão', async () => {
      mockCacheService.get.mockResolvedValue(
        JSON.stringify({ userId: 'user-1', sessionId: 'session-1' }),
      );
      mockUserRepo.findOneBy.mockResolvedValue({ ...baseUser });

      const result = await service.refresh('refresh-token');

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
      expect(mockSessionRepo.update).toHaveBeenCalledWith(
        { id: 'session-1' },
        { tokenHash: 'hash(new-access-token)' },
      );
      expect(mockCacheService.del).toHaveBeenCalledWith('refresh:hash(refresh-token)');
    });
  });

  describe('changePassword', () => {
    it('deve lançar BadRequestException se a password atual for inválida', async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser });
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(service.changePassword('user-1', 'wrong', 'new-pass')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve atualizar a password e revogar sessões ativas', async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser });

      await service.changePassword('user-1', 'old-pass', 'new-pass');

      expect(mockUserRepo.update).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ passwordHash: 'new-hash' }),
      );
      expect(mockSessionRepo.update).toHaveBeenCalledWith(
        { userId: 'user-1', revokedAt: expect.anything() as object },
        { revokedAt: expect.any(Date) as Date },
      );
    });
  });

  describe('verifyMfa', () => {
    it('deve lançar BadRequestException se MFA não tiver sido iniciado', async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser, mfaSecret: null });

      await expect(service.verifyMfa('user-1', '123456')).rejects.toThrow(BadRequestException);
    });

    it('deve ativar o MFA quando o código for válido', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        ...baseUser,
        mfaSecret: 'secret',
        mfaEnabled: false,
      });
      mockMfaService.validateToken.mockReturnValue(true);

      await service.verifyMfa('user-1', '123456');

      expect(mockUserRepo.update).toHaveBeenCalledWith('user-1', { mfaEnabled: true });
    });
  });

  describe('disableMfa', () => {
    it('deve lançar BadRequestException se o código for inválido', async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser, mfaSecret: 'secret' });
      mockMfaService.validateToken.mockReturnValue(false);

      await expect(service.disableMfa('user-1', '000000')).rejects.toThrow(BadRequestException);
    });

    it('deve desativar o MFA e limpar o segredo quando o código for válido', async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser, mfaSecret: 'secret' });
      mockMfaService.validateToken.mockReturnValue(true);

      await service.disableMfa('user-1', '123456');

      expect(mockUserRepo.update).toHaveBeenCalledWith('user-1', {
        mfaSecret: null,
        mfaEnabled: false,
      });
    });
  });

  describe('getProfile', () => {
    it('deve lançar UnauthorizedException se o utilizador não existir', async () => {
      mockUserRepo.findOneBy.mockResolvedValue(null);

      await expect(service.getProfile('missing')).rejects.toThrow(UnauthorizedException);
    });

    it('deve devolver o perfil com as roles do utilizador', async () => {
      mockUserRepo.findOneBy.mockResolvedValue({ ...baseUser });
      mockUserRoleRepo.find.mockResolvedValue([{ role: { name: 'admin' } }]);

      const result = await service.getProfile('user-1');

      expect(result.roles).toEqual(['admin']);
      expect(result.email).toBe(baseUser.email);
    });
  });
});
