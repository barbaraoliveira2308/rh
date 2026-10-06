import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthService, LoginSuccess } from './auth.service';
import { JwtService } from './jwt.service';
import { MfaService } from './mfa.service';
import { SessionsService } from './sessions.service';
import { CacheService } from '../../cache/cache.service';
import { AdminService } from '../../admin/admin.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { AuditService } from '../../audit/services/audit.service';
import { User } from '../entities/user.entity';
import { UserRole } from '../entities/user-role.entity';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { PasswordHistory } from '../entities/password-history.entity';
import { MfaRecoveryCode } from '../entities/mfa-recovery-code.entity';

jest.mock('argon2');

describe('AuthService', () => {
  let service: AuthService;
  let mockUserRepo: Record<string, jest.Mock>;
  let mockUserRoleRepo: Record<string, jest.Mock>;
  let mockPasswordResetTokenRepo: Record<string, jest.Mock>;
  let mockPasswordHistoryRepo: Record<string, jest.Mock>;
  let mockMfaRecoveryCodeRepo: Record<string, jest.Mock>;
  let mockJwtService: Record<string, jest.Mock>;
  let mockMfaService: Record<string, jest.Mock>;
  let mockCacheService: Record<string, jest.Mock>;
  let mockSessions: Record<string, jest.Mock>;
  let mockConfigService: Record<string, jest.Mock>;
  let mockAdminService: Record<string, jest.Mock>;
  let mockNotificationsService: Record<string, jest.Mock>;
  let mockAuditService: Record<string, jest.Mock>;

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
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    mockUserRoleRepo = {
      find: jest.fn().mockResolvedValue([]),
    };
    mockPasswordResetTokenRepo = {
      create: jest.fn((data: Partial<PasswordResetToken>) => data),
      save: jest.fn((data: Partial<PasswordResetToken>) => Promise.resolve(data)),
      findOne: jest.fn(),
    };
    mockPasswordHistoryRepo = {
      create: jest.fn((data: Partial<PasswordHistory>) => data),
      save: jest.fn((data: Partial<PasswordHistory>) => Promise.resolve(data)),
      find: jest.fn().mockResolvedValue([]),
      delete: jest.fn(),
    };
    mockMfaRecoveryCodeRepo = {
      create: jest.fn((data: Partial<MfaRecoveryCode>) => data),
      save: jest.fn((data: Partial<MfaRecoveryCode>[]) => Promise.resolve(data)),
      findOne: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn(),
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
      matchTotpStep: jest.fn(),
      generateSecret: jest.fn(),
      generateQrCodeDataUrl: jest.fn().mockResolvedValue('data:image/png;base64,qr'),
      generateRecoveryCodes: jest.fn().mockReturnValue(['AAAAA-BBBBB', 'CCCCC-DDDDD']),
      isTotpCode: jest.fn((code: string) => /^\d{6}$/.test(code)),
      hashRecoveryCode: jest.fn((code: string) => `rc-hash(${code})`),
    };
    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };
    mockSessions = {
      create: jest.fn().mockResolvedValue({ id: 'session-1' }),
      timeoutMinutes: jest.fn().mockResolvedValue(30),
      touch: jest.fn(),
      isActive: jest.fn().mockResolvedValue(true),
      findByTokenHash: jest.fn().mockResolvedValue(null),
      findByRefreshTokenHash: jest.fn().mockResolvedValue({
        id: 'session-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      }),
      rotate: jest.fn().mockResolvedValue(true),
      revoke: jest.fn(),
      revokeAllForUser: jest.fn(),
    };
    mockConfigService = {
      // Origens distintas de propósito: FRONTEND_URL é a SPA, APP_URL é o backend. Os testes
      // que dependem de links para o utilizador têm de falhar se alguém trocar uma pela outra.
      get: jest.fn((key: string) =>
        key === 'FRONTEND_URL' ? 'http://localhost:5173' : 'http://localhost:3000',
      ),
    };
    mockAdminService = {
      getSettings: jest.fn().mockResolvedValue({
        maxLoginAttempts: 5,
        lockoutPeriodMinutes: 15,
        mfaRequiredForAdmin: true,
      }),
    };
    mockNotificationsService = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
    };
    mockAuditService = {
      log: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(UserRole), useValue: mockUserRoleRepo },
        { provide: getRepositoryToken(PasswordResetToken), useValue: mockPasswordResetTokenRepo },
        { provide: getRepositoryToken(PasswordHistory), useValue: mockPasswordHistoryRepo },
        { provide: getRepositoryToken(MfaRecoveryCode), useValue: mockMfaRecoveryCodeRepo },
        { provide: JwtService, useValue: mockJwtService },
        { provide: MfaService, useValue: mockMfaService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: SessionsService, useValue: mockSessions },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AdminService, useValue: mockAdminService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: AuditService, useValue: mockAuditService },
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

    it('deve bloquear a conta e devolver 403 logo na tentativa que atinge o limite (UC-AUTH-001 fluxo 2a)', async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser, failedLoginCount: 4 });
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(service.login(testEmail, 'wrong')).rejects.toThrow(ForbiddenException);

      expect(mockUserRepo.update).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ failedLoginCount: 5, lockedUntil: expect.any(Date) as Date }),
      );
    });

    it('deve devolver um desafio MFA sem emitir sessão quando o MFA está ativo (UC-AUTH-001 passo 4)', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        ...baseUser,
        failedLoginCount: 2,
        mfaEnabled: true,
        mfaSecret: 'secret',
      });

      const result = await service.login(testEmail, 'secret');

      expect(result).toEqual({ mfaRequired: true, challengeToken: expect.any(String) as string });
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.stringMatching(/^mfa-challenge:hash\(/),
        'user-1',
        5 * 60 * 1000,
      );
      expect(mockJwtService.generateTokenPair).not.toHaveBeenCalled();
      expect(mockSessions.create).not.toHaveBeenCalled();
      // O contador só é reposto quando a sessão é emitida.
      expect(mockUserRepo.update).not.toHaveBeenCalled();
    });

    it('deve autenticar com sucesso, criar sessão e devolver tokens', async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser });
      mockUserRoleRepo.find.mockResolvedValue([{ role: { name: 'employee' } }]);

      const result = (await service.login(testEmail, 'secret', '127.0.0.1')) as LoginSuccess;

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
      // R-061: a sessão vive em hr.sessions, com os hashes dos dois tokens; nada vai para a cache.
      expect(mockSessions.create).toHaveBeenCalledWith(
        'user-1',
        'hash(access-token)',
        'hash(refresh-token)',
        expect.any(Date),
        { ipAddress: '127.0.0.1', userAgent: null },
      );
      const expiresAt = (mockSessions.create.mock.calls[0] as unknown[])[3] as Date;
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now() + 7 * 24 * 60 * 60 * 1000 - 5_000);
      expect(mockCacheService.set).not.toHaveBeenCalled();
      expect(result.sessionTimeoutMinutes).toBe(30);
    });

    it('deve gerar um token de âmbito limitado para admin sem MFA quando mfaRequiredForAdmin está ativo', async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser });
      mockUserRoleRepo.find.mockResolvedValue([{ role: { name: 'admin' } }]);

      await service.login(testEmail, 'secret');

      expect(mockJwtService.generateTokenPair).toHaveBeenCalledWith(
        expect.anything(),
        ['admin'],
        true,
      );
    });

    it('não deve restringir o token de um admin que já tem MFA ativo', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        ...baseUser,
        mfaEnabled: true,
        mfaSecret: 'secret',
      });
      mockUserRoleRepo.find.mockResolvedValue([{ role: { name: 'admin' } }]);
      mockMfaService.matchTotpStep.mockReturnValue(1000);
      mockCacheService.get.mockResolvedValue('user-1');

      await service.loginMfa('a'.repeat(64), '123456');

      expect(mockJwtService.generateTokenPair).toHaveBeenCalledWith(
        expect.anything(),
        ['admin'],
        false,
      );
    });

    it('não deve restringir o token de um utilizador não-admin sem MFA', async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser });
      mockUserRoleRepo.find.mockResolvedValue([{ role: { name: 'employee' } }]);

      await service.login(testEmail, 'secret');

      expect(mockJwtService.generateTokenPair).toHaveBeenCalledWith(
        expect.anything(),
        ['employee'],
        false,
      );
    });

    it('não deve restringir o token quando mfaRequiredForAdmin está desativado', async () => {
      mockAdminService.getSettings.mockResolvedValue({
        maxLoginAttempts: 5,
        lockoutPeriodMinutes: 15,
        mfaRequiredForAdmin: false,
      });
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser });
      mockUserRoleRepo.find.mockResolvedValue([{ role: { name: 'admin' } }]);

      await service.login(testEmail, 'secret');

      expect(mockJwtService.generateTokenPair).toHaveBeenCalledWith(
        expect.anything(),
        ['admin'],
        false,
      );
    });
  });

  describe('loginMfa', () => {
    const challengeToken = 'c'.repeat(64);
    const mfaUser = { ...baseUser, mfaEnabled: true, mfaSecret: 'secret', failedLoginCount: 1 };

    beforeEach(() => {
      mockCacheService.get.mockResolvedValue('user-1');
      mockUserRepo.findOne.mockResolvedValue({ ...mfaUser });
    });

    it('deve rejeitar um desafio inexistente ou expirado', async () => {
      mockCacheService.get.mockResolvedValue(null);

      await expect(service.loginMfa(challengeToken, '123456')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockUserRepo.findOne).not.toHaveBeenCalled();
    });

    it('deve emitir a sessão e consumir o desafio com um código TOTP válido', async () => {
      mockMfaService.matchTotpStep.mockReturnValue(1000);

      const result = await service.loginMfa(challengeToken, '123456', '127.0.0.1');

      expect(result.accessToken).toBe('access-token');
      expect(mockCacheService.del).toHaveBeenCalledWith(`mfa-challenge:hash(${challengeToken})`);
      expect(mockUserRepo.update).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ failedLoginCount: 0, lockedUntil: null }),
      );
      expect(mockSessions.create).toHaveBeenCalled();
    });

    it('deve aceitar um código de recuperação por usar', async () => {
      mockMfaRecoveryCodeRepo.findOne.mockResolvedValue({ id: 'rc-1', usedAt: null });

      const result = await service.loginMfa(challengeToken, 'AAAAA-BBBBB');

      expect(result.accessToken).toBe('access-token');
      expect(mockMfaService.matchTotpStep).not.toHaveBeenCalled();
      expect(mockMfaRecoveryCodeRepo.update).toHaveBeenCalled();
    });

    it('deve rejeitar um código inválido, contar a falha e registar a tentativa (UC-AUTH-001 fluxo 4a)', async () => {
      mockMfaService.matchTotpStep.mockReturnValue(null);

      await expect(service.loginMfa(challengeToken, '000000', '127.0.0.1')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockUserRepo.update).toHaveBeenCalledWith('user-1', { failedLoginCount: 2 });
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGIN_MFA_FAILED', userId: 'user-1' }),
      );
      // O desafio sobrevive a um código errado, para o utilizador poder corrigir.
      expect(mockCacheService.del).not.toHaveBeenCalled();
      expect(mockSessions.create).not.toHaveBeenCalled();
    });

    it('deve bloquear a conta e invalidar o desafio ao atingir o limite de falhas', async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...mfaUser, failedLoginCount: 4 });
      mockMfaService.matchTotpStep.mockReturnValue(null);

      await expect(service.loginMfa(challengeToken, '000000')).rejects.toThrow(ForbiddenException);

      expect(mockUserRepo.update).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ failedLoginCount: 5, lockedUntil: expect.any(Date) as Date }),
      );
      expect(mockCacheService.del).toHaveBeenCalledWith(`mfa-challenge:hash(${challengeToken})`);
    });

    it('deve recusar e invalidar o desafio se a conta estiver bloqueada', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        ...mfaUser,
        lockedUntil: new Date(Date.now() + 60_000),
      });

      await expect(service.loginMfa(challengeToken, '123456')).rejects.toThrow(ForbiddenException);
      expect(mockMfaService.matchTotpStep).not.toHaveBeenCalled();
      expect(mockCacheService.del).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('deve revogar a sessão do access token em hr.sessions', async () => {
      mockSessions.findByTokenHash.mockResolvedValue({ id: 'session-1' });

      await service.logout('hash-1');

      expect(mockSessions.findByTokenHash).toHaveBeenCalledWith('hash-1');
      expect(mockSessions.revoke).toHaveBeenCalledWith('session-1');
    });

    it('não deve falhar se a sessão já não existir', async () => {
      await service.logout('hash-1');

      expect(mockSessions.revoke).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('deve lançar UnauthorizedException se o refresh token não pertencer a nenhuma sessão', async () => {
      mockSessions.findByRefreshTokenHash.mockResolvedValue(null);

      await expect(service.refresh('refresh-token')).rejects.toThrow(
        'Refresh token inválido ou expirado',
      );
      expect(mockSessions.findByRefreshTokenHash).toHaveBeenCalledWith('hash(refresh-token)');
      expect(mockJwtService.generateAccessToken).not.toHaveBeenCalled();
    });

    it('deve lançar UnauthorizedException se a sessão já tiver expirado', async () => {
      mockSessions.findByRefreshTokenHash.mockResolvedValue({
        id: 'session-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.refresh('refresh-token')).rejects.toThrow(
        'Refresh token inválido ou expirado',
      );
    });

    it('deve lançar UnauthorizedException se a sessão tiver sido revogada (UC-AUTH-004 passo 2)', async () => {
      mockSessions.findByRefreshTokenHash.mockResolvedValue({
        id: 'session-1',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      });

      await expect(service.refresh('refresh-token')).rejects.toThrow(
        'Sessão revogada ou inexistente',
      );
      expect(mockJwtService.generateAccessToken).not.toHaveBeenCalled();
    });

    it('deve recusar e revogar uma sessão inativa há mais do que o timeout (BR-AUTH-005)', async () => {
      mockSessions.isActive.mockResolvedValue(false);

      await expect(service.refresh('refresh-token')).rejects.toThrow(
        'Sessão terminada por inatividade',
      );

      expect(mockSessions.revoke).toHaveBeenCalledWith('session-1');
      expect(mockJwtService.generateAccessToken).not.toHaveBeenCalled();
    });

    it('não deve contar o refresh como atividade', async () => {
      mockUserRepo.findOneBy.mockResolvedValue({ ...baseUser });

      await service.refresh('refresh-token');

      expect(mockSessions.touch).not.toHaveBeenCalled();
    });

    it('deve lançar UnauthorizedException se o utilizador estiver inativo', async () => {
      mockUserRepo.findOneBy.mockResolvedValue({ ...baseUser, isActive: false });

      await expect(service.refresh('refresh-token')).rejects.toThrow(UnauthorizedException);
      expect(mockSessions.rotate).not.toHaveBeenCalled();
    });

    it('deve gerar novos tokens e rodar os dois hashes na sessão', async () => {
      mockUserRepo.findOneBy.mockResolvedValue({ ...baseUser });

      const result = await service.refresh('refresh-token');

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
      expect(mockSessions.rotate).toHaveBeenCalledWith(
        'session-1',
        'hash(refresh-token)',
        'hash(new-access-token)',
        'hash(new-refresh-token)',
        expect.any(Date),
      );
      const expiresAt = (mockSessions.rotate.mock.calls[0] as unknown[])[4] as Date;
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now() + 7 * 24 * 60 * 60 * 1000 - 5_000);
    });

    it('deve recusar se outro refresh já tiver rodado o mesmo token', async () => {
      mockUserRepo.findOneBy.mockResolvedValue({ ...baseUser });
      mockSessions.rotate.mockResolvedValue(false);

      await expect(service.refresh('refresh-token')).rejects.toThrow(
        'Refresh token inválido ou expirado',
      );
    });

    it('deve recalcular o âmbito limitado do token para um admin sem MFA', async () => {
      mockUserRepo.findOneBy.mockResolvedValue({ ...baseUser });
      mockUserRoleRepo.find.mockResolvedValue([{ role: { name: 'admin' } }]);

      await service.refresh('refresh-token');

      expect(mockJwtService.generateAccessToken).toHaveBeenCalledWith(
        expect.anything(),
        ['admin'],
        true,
      );
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
      (argon2.verify as jest.Mock)
        .mockResolvedValueOnce(true) // old password válida
        .mockResolvedValueOnce(false); // nova password não reutilizada (BR-AUTH-006)

      await service.changePassword('user-1', 'old-pass', 'new-pass');

      expect(mockUserRepo.update).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ passwordHash: 'new-hash' }),
      );
      // Decisão P107-06: todas, incluindo a de quem trocou/repôs a password.
      expect(mockSessions.revokeAllForUser).toHaveBeenCalledWith('user-1');
    });

    it('deve lançar BadRequestException se a nova password for igual à atual (BR-AUTH-006)', async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser });
      (argon2.verify as jest.Mock)
        .mockResolvedValueOnce(true) // old password válida
        .mockResolvedValueOnce(true); // nova password igual à atual

      await expect(service.changePassword('user-1', 'old-pass', 'Old-Pass1!')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockUserRepo.update).not.toHaveBeenCalled();
    });

    it('deve lançar BadRequestException se a nova password coincidir com uma das últimas 4 guardadas em histórico (BR-AUTH-006)', async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser });
      mockPasswordHistoryRepo.find.mockResolvedValue([
        { id: 'h-1', passwordHash: 'old-hash-1' },
        { id: 'h-2', passwordHash: 'old-hash-2' },
      ]);
      (argon2.verify as jest.Mock)
        .mockResolvedValueOnce(true) // old password válida
        .mockResolvedValueOnce(false) // não coincide com a atual
        .mockResolvedValueOnce(false) // não coincide com h-1
        .mockResolvedValueOnce(true); // coincide com h-2

      await expect(service.changePassword('user-1', 'old-pass', 'Reused-Pass1!')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockUserRepo.update).not.toHaveBeenCalled();
    });

    it('deve guardar a password antiga no histórico e manter só as últimas 4 entradas', async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser });
      mockPasswordHistoryRepo.find
        .mockResolvedValueOnce([]) // consulta feita por ensurePasswordNotReused
        .mockResolvedValueOnce([
          { id: 'h-1' },
          { id: 'h-2' },
          { id: 'h-3' },
          { id: 'h-4' },
          { id: 'h-5' },
        ]); // consulta feita por recordPasswordHistory, já com a nova entrada
      (argon2.verify as jest.Mock)
        .mockResolvedValueOnce(true) // old password válida
        .mockResolvedValueOnce(false); // nova password não reutilizada

      await service.changePassword('user-1', 'old-pass', 'new-pass');

      expect(mockPasswordHistoryRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', passwordHash: 'hashed' }),
      );
      expect(mockPasswordHistoryRepo.delete).toHaveBeenCalledWith(['h-5']);
    });
  });

  describe('resetPassword', () => {
    it('não deve gerar token nem enviar email se o utilizador não existir (evita enumeração)', async () => {
      mockUserRepo.findOneBy.mockResolvedValue(null);

      await service.resetPassword('inexistente@bridge351.pt');

      expect(mockPasswordResetTokenRepo.save).not.toHaveBeenCalled();
      expect(mockNotificationsService.sendEmail).not.toHaveBeenCalled();
    });

    it('deve gerar e guardar um token com hash e enviar email de reset', async () => {
      mockUserRepo.findOneBy.mockResolvedValue({ ...baseUser });

      await service.resetPassword(testEmail);

      expect(mockPasswordResetTokenRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          tokenHash: expect.stringMatching(/^hash\(/) as string,
          expiresAt: expect.any(Date) as Date,
        }),
      );
      expect(mockNotificationsService.sendEmail).toHaveBeenCalledWith(
        testEmail,
        'password-reset',
        expect.objectContaining({
          // Tem de apontar para a SPA (FRONTEND_URL) e para a rota que consome o token,
          // não para a origem do backend nem para a página que só pede o reset.
          resetUrl: expect.stringMatching(
            /^http:\/\/localhost:5173\/auth\/reset-password\/confirm\?token=[0-9a-f]{64}$/,
          ) as string,
        }),
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'PASSWORD_RESET_REQUESTED', userId: 'user-1' }),
      );
    });
  });

  describe('confirmResetPassword', () => {
    it('deve lançar BadRequestException se o token não existir', async () => {
      mockPasswordResetTokenRepo.findOne.mockResolvedValue(null);

      await expect(service.confirmResetPassword('bad-token', 'New-Pass1!')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar BadRequestException se o token já tiver sido usado', async () => {
      mockPasswordResetTokenRepo.findOne.mockResolvedValue({
        userId: 'user-1',
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 60000),
      });

      await expect(service.confirmResetPassword('used-token', 'New-Pass1!')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve distinguir token expirado de token inválido (UC-AUTH-003 fluxo alternativo 3a)', async () => {
      mockPasswordResetTokenRepo.findOne.mockResolvedValue({
        userId: 'user-1',
        usedAt: null,
        expiresAt: new Date(Date.now() - 60000),
      });

      await expect(service.confirmResetPassword('expired-token', 'New-Pass1!')).rejects.toThrow(
        /expirado/i,
      );

      mockPasswordResetTokenRepo.findOne.mockResolvedValue(null);

      await expect(service.confirmResetPassword('bad-token', 'New-Pass1!')).rejects.toThrow(
        /inválido/i,
      );
    });

    it('deve atualizar a password, marcar o token como usado e revogar sessões', async () => {
      mockPasswordResetTokenRepo.findOne.mockResolvedValue({
        userId: 'user-1',
        usedAt: null,
        expiresAt: new Date(Date.now() + 60000),
      });
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser });
      (argon2.verify as jest.Mock).mockResolvedValue(false); // nova password não reutilizada

      await service.confirmResetPassword('valid-token', 'New-Pass1!');

      expect(mockUserRepo.update).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ passwordHash: 'new-hash' }),
      );
      expect(mockPasswordResetTokenRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ usedAt: expect.any(Date) as Date }),
      );
      // Decisão P107-06: todas, incluindo a de quem trocou/repôs a password.
      expect(mockSessions.revokeAllForUser).toHaveBeenCalledWith('user-1');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'PASSWORD_RESET_COMPLETED', userId: 'user-1' }),
      );
    });

    it('deve lançar BadRequestException se a nova password reutilizar a atual (BR-AUTH-006)', async () => {
      mockPasswordResetTokenRepo.findOne.mockResolvedValue({
        userId: 'user-1',
        usedAt: null,
        expiresAt: new Date(Date.now() + 60000),
      });
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser });
      (argon2.verify as jest.Mock).mockResolvedValue(true); // coincide com a atual

      await expect(service.confirmResetPassword('valid-token', 'Old-Pass1!')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockUserRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('enableMfa', () => {
    it('deve gerar o segredo com o email como etiqueta e devolver a imagem do QR code', async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser, mfaEnabled: false });
      mockMfaService.generateSecret.mockReturnValue({
        secret: 'SECRET',
        encryptedSecret: 'encrypted',
        qrCodeUrl: 'otpauth://totp/x',
      });

      const result = await service.enableMfa('user-1');

      expect(mockMfaService.generateSecret).toHaveBeenCalledWith(testEmail);
      expect(result).toEqual({
        secret: 'SECRET',
        qrCodeUrl: 'otpauth://totp/x',
        qrCodeDataUrl: 'data:image/png;base64,qr',
      });
      expect(mockUserRepo.update).toHaveBeenCalledWith('user-1', {
        mfaSecret: 'encrypted',
        mfaEnabled: false,
        mfaLastUsedStep: null,
      });
    });

    it('deve recusar reiniciar a configuração quando o MFA já está ativo (decisão P092-03)', async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser, mfaEnabled: true });

      await expect(service.enableMfa('user-1')).rejects.toThrow(BadRequestException);
      expect(mockUserRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('verifyMfa', () => {
    it('deve lançar BadRequestException se MFA não tiver sido iniciado', async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser, mfaSecret: null });

      await expect(service.verifyMfa('user-1', '123456')).rejects.toThrow(BadRequestException);
    });

    it('deve ativar o MFA e devolver códigos de recuperação guardados só em hash (UC-AUTH-005 passos 5 e 6)', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        ...baseUser,
        mfaSecret: 'secret',
        mfaEnabled: false,
      });
      mockMfaService.matchTotpStep.mockReturnValue(1000);

      const result = await service.verifyMfa('user-1', '123456');

      expect(mockUserRepo.update).toHaveBeenCalledWith('user-1', { mfaEnabled: true });
      expect(result.recoveryCodes).toEqual(['AAAAA-BBBBB', 'CCCCC-DDDDD']);
      expect(mockMfaRecoveryCodeRepo.delete).toHaveBeenCalledWith({ userId: 'user-1' });
      expect(mockMfaRecoveryCodeRepo.save).toHaveBeenCalledWith([
        { userId: 'user-1', codeHash: 'rc-hash(AAAAA-BBBBB)' },
        { userId: 'user-1', codeHash: 'rc-hash(CCCCC-DDDDD)' },
      ]);
    });

    it('não deve ativar o MFA nem gerar códigos se o código for inválido', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        ...baseUser,
        mfaSecret: 'secret',
        mfaEnabled: false,
      });
      mockMfaService.matchTotpStep.mockReturnValue(null);

      await expect(service.verifyMfa('user-1', '000000')).rejects.toThrow(BadRequestException);
      expect(mockUserRepo.update).not.toHaveBeenCalled();
      expect(mockMfaRecoveryCodeRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('R-065 — reutilização de códigos e sessões', () => {
    beforeEach(() => {
      mockSessions.findByTokenHash.mockImplementation((hash: string) =>
        Promise.resolve(hash === 'current-hash' ? { id: 's-current' } : null),
      );
    });

    it('deve recusar um código TOTP cujo passo já foi aceite', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        ...baseUser,
        mfaSecret: 'secret',
        mfaEnabled: true,
      });
      mockMfaService.matchTotpStep.mockReturnValue(1000);
      mockUserRepo.update.mockResolvedValue({ affected: 0 });

      await expect(service.regenerateRecoveryCodes('user-1', '123456')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockUserRepo.update).toHaveBeenCalledWith(expect.objectContaining({ id: 'user-1' }), {
        mfaLastUsedStep: 1000,
      });
      expect(mockMfaRecoveryCodeRepo.delete).not.toHaveBeenCalled();
    });

    it('ao ativar o MFA, deve terminar as outras sessões e manter a corrente', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        ...baseUser,
        mfaSecret: 'secret',
        mfaEnabled: false,
      });
      mockMfaService.matchTotpStep.mockReturnValue(1000);

      await service.verifyMfa('user-1', '123456', 'current-hash');

      expect(mockSessions.revokeAllForUser).toHaveBeenCalledWith('user-1', 's-current');
    });

    it('ao desativar o MFA sem ser obrigatório, deve manter a sessão corrente', async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser, mfaSecret: 'secret' });
      mockMfaService.matchTotpStep.mockReturnValue(1000);
      mockUserRoleRepo.find.mockResolvedValue([{ role: { name: 'employee' } }]);

      const result = await service.disableMfa('user-1', '123456', 'current-hash');

      expect(result).toEqual({ sessionEnded: false });
      expect(mockSessions.revokeAllForUser).toHaveBeenCalledWith('user-1', 's-current');
    });

    it('ao desativar o MFA obrigatório de um admin, deve terminar todas as sessões (decisão P095-02)', async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser, mfaSecret: 'secret' });
      mockMfaService.matchTotpStep.mockReturnValue(1000);
      mockUserRoleRepo.find.mockResolvedValue([{ role: { name: 'admin' } }]);

      const result = await service.disableMfa('user-1', '123456', 'current-hash');

      expect(result).toEqual({ sessionEnded: true });
      expect(mockSessions.revokeAllForUser).toHaveBeenCalledWith('user-1', undefined);
    });
  });

  describe('regenerateRecoveryCodes', () => {
    it('deve substituir os códigos quando o código TOTP for válido', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        ...baseUser,
        mfaSecret: 'secret',
        mfaEnabled: true,
      });
      mockMfaService.matchTotpStep.mockReturnValue(1000);

      const result = await service.regenerateRecoveryCodes('user-1', '123456');

      expect(result.recoveryCodes).toHaveLength(2);
      expect(mockMfaRecoveryCodeRepo.delete).toHaveBeenCalledWith({ userId: 'user-1' });
    });

    it('deve recusar quando o MFA não está ativo', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        ...baseUser,
        mfaSecret: 'secret',
        mfaEnabled: false,
      });

      await expect(service.regenerateRecoveryCodes('user-1', '123456')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve recusar quando o código TOTP for inválido', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        ...baseUser,
        mfaSecret: 'secret',
        mfaEnabled: true,
      });
      mockMfaService.matchTotpStep.mockReturnValue(null);

      await expect(service.regenerateRecoveryCodes('user-1', '000000')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockMfaRecoveryCodeRepo.delete).not.toHaveBeenCalled();
    });
  });

  describe('disableMfa', () => {
    it('deve lançar BadRequestException se o código for inválido', async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser, mfaSecret: 'secret' });
      mockMfaService.matchTotpStep.mockReturnValue(null);

      await expect(service.disableMfa('user-1', '000000')).rejects.toThrow(BadRequestException);
    });

    it('deve desativar o MFA, limpar o segredo e apagar os códigos de recuperação', async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser, mfaSecret: 'secret' });
      mockMfaService.matchTotpStep.mockReturnValue(1000);

      await service.disableMfa('user-1', '123456');

      expect(mockUserRepo.update).toHaveBeenCalledWith('user-1', {
        mfaSecret: null,
        mfaEnabled: false,
        mfaLastUsedStep: null,
      });
      expect(mockMfaRecoveryCodeRepo.delete).toHaveBeenCalledWith({ userId: 'user-1' });
    });

    it('deve aceitar um código de recuperação por usar e marcá-lo como usado (decisão P092-04)', async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser, mfaSecret: 'secret' });
      mockMfaRecoveryCodeRepo.findOne.mockResolvedValue({ id: 'rc-1', usedAt: null });

      await service.disableMfa('user-1', 'AAAAA-BBBBB');

      expect(mockMfaService.matchTotpStep).not.toHaveBeenCalled();
      expect(mockMfaRecoveryCodeRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'rc-1' }),
        { usedAt: expect.any(Date) as Date },
      );
      expect(mockUserRepo.update).toHaveBeenCalledWith('user-1', {
        mfaSecret: null,
        mfaEnabled: false,
        mfaLastUsedStep: null,
      });
    });

    it('deve rejeitar um código de recuperação inexistente ou já usado', async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser, mfaSecret: 'secret' });
      mockMfaRecoveryCodeRepo.findOne.mockResolvedValue(null);

      await expect(service.disableMfa('user-1', 'AAAAA-BBBBB')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockUserRepo.update).not.toHaveBeenCalled();
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
