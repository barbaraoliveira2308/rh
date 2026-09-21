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
import { NotificationsService } from '../../notifications/services/notifications.service';
import { AuditService } from '../../audit/services/audit.service';
import { User } from '../entities/user.entity';
import { Session } from '../entities/session.entity';
import { UserRole } from '../entities/user-role.entity';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { PasswordHistory } from '../entities/password-history.entity';
import { MfaRecoveryCode } from '../entities/mfa-recovery-code.entity';

jest.mock('argon2');

describe('AuthService', () => {
  let service: AuthService;
  let mockUserRepo: Record<string, jest.Mock>;
  let mockSessionRepo: Record<string, jest.Mock>;
  let mockUserRoleRepo: Record<string, jest.Mock>;
  let mockPasswordResetTokenRepo: Record<string, jest.Mock>;
  let mockPasswordHistoryRepo: Record<string, jest.Mock>;
  let mockMfaRecoveryCodeRepo: Record<string, jest.Mock>;
  let mockJwtService: Record<string, jest.Mock>;
  let mockMfaService: Record<string, jest.Mock>;
  let mockCacheService: Record<string, jest.Mock>;
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
      update: jest.fn(),
    };
    mockSessionRepo = {
      create: jest.fn((data: Partial<Session>) => data),
      save: jest.fn((data: Partial<Session>) => Promise.resolve({ id: 'session-1', ...data })),
      update: jest.fn(),
      findOneBy: jest.fn(() => Promise.resolve({ id: 'session-1', revokedAt: null })),
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
      validateToken: jest.fn(),
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
        { provide: getRepositoryToken(Session), useValue: mockSessionRepo },
        { provide: getRepositoryToken(UserRole), useValue: mockUserRoleRepo },
        { provide: getRepositoryToken(PasswordResetToken), useValue: mockPasswordResetTokenRepo },
        { provide: getRepositoryToken(PasswordHistory), useValue: mockPasswordHistoryRepo },
        { provide: getRepositoryToken(MfaRecoveryCode), useValue: mockMfaRecoveryCodeRepo },
        { provide: JwtService, useValue: mockJwtService },
        { provide: MfaService, useValue: mockMfaService },
        { provide: CacheService, useValue: mockCacheService },
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
      mockMfaService.validateToken.mockReturnValue(true);

      await service.login(testEmail, 'secret', '123456');

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

    it('deve lançar UnauthorizedException se a sessão tiver sido revogada (UC-AUTH-004 passo 2)', async () => {
      mockCacheService.get.mockResolvedValue(
        JSON.stringify({ userId: 'user-1', sessionId: 'session-1' }),
      );
      mockSessionRepo.findOneBy.mockResolvedValue({ id: 'session-1', revokedAt: new Date() });

      await expect(service.refresh('refresh-token')).rejects.toThrow(UnauthorizedException);
      expect(mockJwtService.generateAccessToken).not.toHaveBeenCalled();
    });

    it('deve lançar UnauthorizedException se a sessão não existir (decisão P090-02)', async () => {
      mockCacheService.get.mockResolvedValue(
        JSON.stringify({ userId: 'user-1', sessionId: 'session-inexistente' }),
      );
      mockSessionRepo.findOneBy.mockResolvedValue(null);

      await expect(service.refresh('refresh-token')).rejects.toThrow(UnauthorizedException);
      expect(mockJwtService.generateAccessToken).not.toHaveBeenCalled();
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

    it('deve recalcular o âmbito limitado do token para um admin sem MFA', async () => {
      mockCacheService.get.mockResolvedValue(
        JSON.stringify({ userId: 'user-1', sessionId: 'session-1' }),
      );
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
      expect(mockSessionRepo.update).toHaveBeenCalledWith(
        { userId: 'user-1', revokedAt: expect.anything() as object },
        { revokedAt: expect.any(Date) as Date },
      );
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
      expect(mockSessionRepo.update).toHaveBeenCalledWith(
        { userId: 'user-1', revokedAt: expect.anything() as object },
        { revokedAt: expect.any(Date) as Date },
      );
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
      mockMfaService.validateToken.mockReturnValue(true);

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
      mockMfaService.validateToken.mockReturnValue(false);

      await expect(service.verifyMfa('user-1', '000000')).rejects.toThrow(BadRequestException);
      expect(mockUserRepo.update).not.toHaveBeenCalled();
      expect(mockMfaRecoveryCodeRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('regenerateRecoveryCodes', () => {
    it('deve substituir os códigos quando o código TOTP for válido', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        ...baseUser,
        mfaSecret: 'secret',
        mfaEnabled: true,
      });
      mockMfaService.validateToken.mockReturnValue(true);

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
      mockMfaService.validateToken.mockReturnValue(false);

      await expect(service.regenerateRecoveryCodes('user-1', '000000')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockMfaRecoveryCodeRepo.delete).not.toHaveBeenCalled();
    });
  });

  describe('disableMfa', () => {
    it('deve lançar BadRequestException se o código for inválido', async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser, mfaSecret: 'secret' });
      mockMfaService.validateToken.mockReturnValue(false);

      await expect(service.disableMfa('user-1', '000000')).rejects.toThrow(BadRequestException);
    });

    it('deve desativar o MFA, limpar o segredo e apagar os códigos de recuperação', async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser, mfaSecret: 'secret' });
      mockMfaService.validateToken.mockReturnValue(true);

      await service.disableMfa('user-1', '123456');

      expect(mockUserRepo.update).toHaveBeenCalledWith('user-1', {
        mfaSecret: null,
        mfaEnabled: false,
      });
      expect(mockMfaRecoveryCodeRepo.delete).toHaveBeenCalledWith({ userId: 'user-1' });
    });

    it('deve aceitar um código de recuperação por usar e marcá-lo como usado (decisão P092-04)', async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser, mfaSecret: 'secret' });
      mockMfaRecoveryCodeRepo.findOne.mockResolvedValue({ id: 'rc-1', usedAt: null });

      await service.disableMfa('user-1', 'AAAAA-BBBBB');

      expect(mockMfaService.validateToken).not.toHaveBeenCalled();
      expect(mockMfaRecoveryCodeRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'rc-1' }),
        { usedAt: expect.any(Date) as Date },
      );
      expect(mockUserRepo.update).toHaveBeenCalledWith('user-1', {
        mfaSecret: null,
        mfaEnabled: false,
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
