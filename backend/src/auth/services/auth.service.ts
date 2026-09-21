import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import * as argon2 from 'argon2';
import * as crypto from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { User } from '../entities/user.entity';
import { Session } from '../entities/session.entity';
import { UserRole } from '../entities/user-role.entity';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { PasswordHistory } from '../entities/password-history.entity';
import { MfaRecoveryCode } from '../entities/mfa-recovery-code.entity';
import { JwtService } from './jwt.service';
import { MfaService } from './mfa.service';
import { CacheService } from '../../cache/cache.service';
import { AdminService } from '../../admin/admin.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { AuditService } from '../../audit/services/audit.service';

const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const PASSWORD_HISTORY_ENTRIES_KEPT = 4;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<PasswordResetToken>,
    @InjectRepository(PasswordHistory)
    private readonly passwordHistoryRepository: Repository<PasswordHistory>,
    @InjectRepository(MfaRecoveryCode)
    private readonly mfaRecoveryCodeRepository: Repository<MfaRecoveryCode>,
    private readonly jwtService: JwtService,
    private readonly mfaService: MfaService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
    private readonly adminService: AdminService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  async login(
    email: string,
    password: string,
    mfaCode?: string,
    ip?: string,
    userAgent?: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string; username: string; roles: string[] };
    mfaSetupRequired: boolean;
  }> {
    const user = await this.userRepository.findOne({
      where: { email },
      select: [
        'id',
        'email',
        'username',
        'passwordHash',
        'isActive',
        'mfaEnabled',
        'mfaSecret',
        'failedLoginCount',
        'lockedUntil',
        'passwordChangedAt',
      ],
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Conta desativada');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException('Conta bloqueada temporariamente');
    }

    const passwordValid = await argon2.verify(user.passwordHash, password);
    if (!passwordValid) {
      await this.handleFailedLogin(user);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (user.mfaEnabled) {
      if (!mfaCode) {
        throw new BadRequestException('Código MFA obrigatório');
      }
      if (!user.mfaSecret) {
        throw new BadRequestException('MFA não configurado');
      }
      const isValid = this.mfaService.validateToken(user.mfaSecret, mfaCode);
      if (!isValid) {
        throw new UnauthorizedException('Código MFA inválido');
      }
    }

    await this.userRepository.update(user.id, {
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    });

    const userRoles = await this.userRoleRepository.find({
      where: { userId: user.id },
      relations: { role: true },
    });
    const roles = userRoles.map((ur) => ur.role.name);

    const mfaSetupRequired = await this.isMfaSetupRequired(user, roles);

    const tokens = this.jwtService.generateTokenPair(user, roles, mfaSetupRequired);

    const accessHash = this.jwtService.computeTokenHash(tokens.accessToken);
    const refreshHash = this.jwtService.computeTokenHash(tokens.refreshToken);

    const session = this.sessionRepository.create({
      userId: user.id,
      tokenHash: accessHash,
      ipAddress: ip ?? 'unknown',
      userAgent: userAgent ?? null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await this.sessionRepository.save(session);

    await this.cacheService.set(`session:${accessHash}`, user.id, 15 * 60 * 1000);
    await this.cacheService.set(
      `refresh:${refreshHash}`,
      JSON.stringify({ userId: user.id, sessionId: session.id }),
      7 * 24 * 60 * 60 * 1000,
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        roles,
      },
      mfaSetupRequired,
    };
  }

  async logout(tokenHash: string): Promise<void> {
    await this.cacheService.del(`session:${tokenHash}`);
    await this.sessionRepository.update({ tokenHash }, { revokedAt: new Date() });
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = this.jwtService.verifyRefreshToken(refreshToken);
    const oldRefreshHash = this.jwtService.computeTokenHash(refreshToken);

    const sessionData = await this.cacheService.get(`refresh:${oldRefreshHash}`);
    if (!sessionData) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    const parsed = JSON.parse(sessionData) as { userId: string; sessionId: string };

    await this.cacheService.del(`refresh:${oldRefreshHash}`);

    // O logout marca a sessão como revogada em hr.sessions mas não consegue apagar a chave
    // `refresh:<hash>` (não conhece o hash do refresh token), pelo que a revogação tem de ser
    // verificada aqui — vale também para changePassword()/confirmResetPassword().
    const session = await this.sessionRepository.findOneBy({ id: parsed.sessionId });
    if (!session || session.revokedAt) {
      throw new UnauthorizedException('Sessão revogada ou inexistente');
    }

    const user = await this.userRepository.findOneBy({ id: payload.sub });
    if (!user?.isActive) {
      throw new UnauthorizedException('Utilizador não encontrado ou inativo');
    }

    const userRoles = await this.userRoleRepository.find({
      where: { userId: user.id },
      relations: { role: true },
    });
    const roles = userRoles.map((ur) => ur.role.name);

    const mfaSetupRequired = await this.isMfaSetupRequired(user, roles);

    const newAccessToken = this.jwtService.generateAccessToken(user, roles, mfaSetupRequired);
    const newRefreshToken = this.jwtService.generateRefreshToken(user);

    const newAccessHash = this.jwtService.computeTokenHash(newAccessToken);
    const newRefreshHash = this.jwtService.computeTokenHash(newRefreshToken);

    await this.sessionRepository.update({ id: parsed.sessionId }, { tokenHash: newAccessHash });

    await this.cacheService.set(`session:${newAccessHash}`, user.id, 15 * 60 * 1000);
    await this.cacheService.set(
      `refresh:${newRefreshHash}`,
      JSON.stringify({ userId: user.id, sessionId: parsed.sessionId }),
      7 * 24 * 60 * 60 * 1000,
    );

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async enableMfa(
    userId: string,
  ): Promise<{ secret: string; qrCodeUrl: string; qrCodeDataUrl: string }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'mfaEnabled'],
    });

    if (!user) {
      throw new UnauthorizedException('Utilizador não encontrado');
    }

    // Sem esta verificação, qualquer portador de um access token (roubado, por exemplo) podia
    // substituir o segredo e desligar o MFA sem nunca apresentar um código (decisão P092-03).
    if (user.mfaEnabled) {
      throw new BadRequestException('MFA já está ativo');
    }

    const { secret, encryptedSecret, qrCodeUrl } = this.mfaService.generateSecret(user.email);
    const qrCodeDataUrl = await this.mfaService.generateQrCodeDataUrl(qrCodeUrl);

    await this.userRepository.update(userId, {
      mfaSecret: encryptedSecret,
      mfaEnabled: false,
    });

    return { secret, qrCodeUrl, qrCodeDataUrl };
  }

  async verifyMfa(userId: string, code: string): Promise<{ recoveryCodes: string[] }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'mfaSecret', 'mfaEnabled'],
    });

    if (!user?.mfaSecret) {
      throw new BadRequestException('MFA não foi iniciado');
    }

    if (user.mfaEnabled) {
      throw new BadRequestException('MFA já está ativo');
    }

    const isValid = this.mfaService.validateToken(user.mfaSecret, code);

    if (!isValid) {
      throw new BadRequestException('Código MFA inválido');
    }

    await this.userRepository.update(userId, { mfaEnabled: true });

    // UC-AUTH-005 passo 6: os códigos só existem em claro nesta resposta.
    const recoveryCodes = await this.replaceRecoveryCodes(userId);
    return { recoveryCodes };
  }

  async regenerateRecoveryCodes(
    userId: string,
    code: string,
  ): Promise<{ recoveryCodes: string[] }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'mfaSecret', 'mfaEnabled'],
    });

    if (!user?.mfaEnabled || !user.mfaSecret) {
      throw new BadRequestException('MFA não está ativo');
    }

    // Só TOTP: um código de recuperação não pode servir para emitir códigos novos.
    if (!this.mfaService.validateToken(user.mfaSecret, code)) {
      throw new BadRequestException('Código MFA inválido');
    }

    const recoveryCodes = await this.replaceRecoveryCodes(userId);
    return { recoveryCodes };
  }

  async disableMfa(userId: string, code: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'mfaSecret'],
    });

    if (!user?.mfaSecret) {
      throw new BadRequestException('MFA não está configurado');
    }

    // Aceita também um código de recuperação: é o caminho de quem perdeu o telemóvel para
    // voltar a configurar o MFA (decisão P092-04).
    const isValid = await this.verifySecondFactor(userId, user.mfaSecret, code);

    if (!isValid) {
      throw new BadRequestException('Código MFA inválido');
    }

    await this.userRepository.update(userId, {
      mfaSecret: null,
      mfaEnabled: false,
    });
    await this.mfaRecoveryCodeRepository.delete({ userId });
  }

  private async verifySecondFactor(
    userId: string,
    encryptedSecret: string,
    code: string,
  ): Promise<boolean> {
    if (this.mfaService.isTotpCode(code)) {
      return this.mfaService.validateToken(encryptedSecret, code.trim());
    }

    const recoveryCode = await this.mfaRecoveryCodeRepository.findOne({
      where: { userId, codeHash: this.mfaService.hashRecoveryCode(code), usedAt: IsNull() },
    });
    if (!recoveryCode) {
      return false;
    }

    // Uso único: o UPDATE condicional impede que dois pedidos simultâneos gastem o mesmo código.
    const result = await this.mfaRecoveryCodeRepository.update(
      { id: recoveryCode.id, usedAt: IsNull() },
      { usedAt: new Date() },
    );
    return (result.affected ?? 0) > 0;
  }

  private async replaceRecoveryCodes(userId: string): Promise<string[]> {
    const codes = this.mfaService.generateRecoveryCodes();

    await this.mfaRecoveryCodeRepository.delete({ userId });
    await this.mfaRecoveryCodeRepository.save(
      codes.map((code) =>
        this.mfaRecoveryCodeRepository.create({
          userId,
          codeHash: this.mfaService.hashRecoveryCode(code),
        }),
      ),
    );

    return codes;
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'passwordHash'],
    });

    if (!user) {
      throw new UnauthorizedException('Utilizador não encontrado');
    }

    const isValid = await argon2.verify(user.passwordHash, oldPassword);
    if (!isValid) {
      throw new BadRequestException('Password atual inválida');
    }

    await this.ensurePasswordNotReused(userId, user.passwordHash, newPassword);

    const newHash = await argon2.hash(newPassword);
    await this.userRepository.update(userId, {
      passwordHash: newHash,
      passwordChangedAt: new Date(),
    });
    await this.recordPasswordHistory(userId, user.passwordHash);

    await this.sessionRepository.update({ userId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  private async ensurePasswordNotReused(
    userId: string,
    currentHash: string,
    newPassword: string,
  ): Promise<void> {
    const history = await this.passwordHistoryRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: PASSWORD_HISTORY_ENTRIES_KEPT,
    });

    const hashesToCheck = [currentHash, ...history.map((entry) => entry.passwordHash)];

    for (const hash of hashesToCheck) {
      if (await argon2.verify(hash, newPassword)) {
        throw new BadRequestException('Não é permitido reutilizar nenhuma das últimas 5 passwords');
      }
    }
  }

  private async recordPasswordHistory(userId: string, oldHash: string): Promise<void> {
    await this.passwordHistoryRepository.save(
      this.passwordHistoryRepository.create({ userId, passwordHash: oldHash }),
    );

    const entries = await this.passwordHistoryRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const toDelete = entries.slice(PASSWORD_HISTORY_ENTRIES_KEPT);
    if (toDelete.length > 0) {
      await this.passwordHistoryRepository.delete(toDelete.map((entry) => entry.id));
    }
  }

  async resetPassword(email: string): Promise<void> {
    const user = await this.userRepository.findOneBy({ email });
    if (!user) {
      return;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.jwtService.computeTokenHash(rawToken);

    await this.passwordResetTokenRepository.save(
      this.passwordResetTokenRepository.create({
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
      }),
    );

    // FRONTEND_URL (não APP_URL): este link é para o utilizador, tem de apontar para a SPA.
    // APP_URL é a origem do backend e é usada pelo redirect_uri do SSO.
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    await this.notificationsService.sendEmail(user.email, 'password-reset', {
      resetUrl: `${frontendUrl}/auth/reset-password/confirm?token=${rawToken}`,
      expiresInMinutes: PASSWORD_RESET_TOKEN_TTL_MS / 60000,
    });

    this.auditService.log({
      userId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      entityType: 'User',
      entityId: user.id,
      module: 'auth',
    });
  }

  async confirmResetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = this.jwtService.computeTokenHash(token);
    const resetToken = await this.passwordResetTokenRepository.findOne({ where: { tokenHash } });

    if (!resetToken || resetToken.usedAt) {
      throw new BadRequestException('Token de reset inválido');
    }

    // UC-AUTH-003 fluxo alternativo 3a: distinguir expirado de inválido, para o frontend poder
    // oferecer "pedir novo link" em vez de um beco sem saída.
    if (resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Token de reset expirado. Pede um novo link de recuperação.');
    }

    const user = await this.userRepository.findOne({
      where: { id: resetToken.userId },
      select: ['id', 'passwordHash'],
    });
    if (!user) {
      throw new UnauthorizedException('Utilizador não encontrado');
    }

    await this.ensurePasswordNotReused(resetToken.userId, user.passwordHash, newPassword);

    const newHash = await argon2.hash(newPassword);
    await this.userRepository.update(resetToken.userId, {
      passwordHash: newHash,
      passwordChangedAt: new Date(),
    });
    await this.recordPasswordHistory(resetToken.userId, user.passwordHash);

    resetToken.usedAt = new Date();
    await this.passwordResetTokenRepository.save(resetToken);

    await this.sessionRepository.update(
      { userId: resetToken.userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );

    this.auditService.log({
      userId: resetToken.userId,
      action: 'PASSWORD_RESET_COMPLETED',
      entityType: 'User',
      entityId: resetToken.userId,
      module: 'auth',
    });
  }

  async getProfile(userId: string): Promise<{
    id: string;
    email: string;
    username: string;
    isActive: boolean;
    mfaEnabled: boolean;
    lastLoginAt: Date | null;
    roles: string[];
  }> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new UnauthorizedException('Utilizador não encontrado');
    }

    const userRoles = await this.userRoleRepository.find({
      where: { userId },
      relations: { role: true },
    });
    const roles = userRoles.map((ur) => ur.role.name);

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      isActive: user.isActive,
      mfaEnabled: user.mfaEnabled,
      lastLoginAt: user.lastLoginAt,
      roles,
    };
  }

  async ssoLogin(
    code: string,
    keycloakService: {
      exchangeCodeForTokens(
        code: string,
        redirectUri: string,
      ): Promise<{ accessToken: string; refreshToken: string }>;
      getUserInfo(
        accessToken: string,
      ): Promise<{ sub: string; email: string; preferred_username?: string }>;
      syncUser(userInfo: {
        sub: string;
        email: string;
        preferred_username?: string;
      }): Promise<User>;
    },
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const redirectUri = `${this.configService.get<string>('APP_URL', 'http://localhost:3000')}/auth/sso/callback`;
    const kcTokens = await keycloakService.exchangeCodeForTokens(code, redirectUri);
    const userInfo = await keycloakService.getUserInfo(kcTokens.accessToken);
    const user = await keycloakService.syncUser(userInfo);

    const userRoles = await this.userRoleRepository.find({
      where: { userId: user.id },
      relations: { role: true },
    });
    const roles = userRoles.map((ur) => ur.role.name);

    const internalTokens = this.jwtService.generateTokenPair(user, roles);

    const accessHash = this.jwtService.computeTokenHash(internalTokens.accessToken);
    const refreshHash = this.jwtService.computeTokenHash(internalTokens.refreshToken);

    await this.cacheService.set(`session:${accessHash}`, user.id, 15 * 60 * 1000);
    await this.cacheService.set(
      `refresh:${refreshHash}`,
      JSON.stringify({ userId: user.id, sessionId: user.id }),
      7 * 24 * 60 * 60 * 1000,
    );

    return {
      accessToken: internalTokens.accessToken,
      refreshToken: internalTokens.refreshToken,
    };
  }

  private async isMfaSetupRequired(
    user: Pick<User, 'mfaEnabled'>,
    roles: string[],
  ): Promise<boolean> {
    if (user.mfaEnabled || !roles.includes('admin')) {
      return false;
    }
    const settings = await this.adminService.getSettings();
    return settings.mfaRequiredForAdmin;
  }

  private async handleFailedLogin(user: User): Promise<void> {
    const settings = await this.adminService.getSettings();
    const newCount = user.failedLoginCount + 1;

    if (newCount >= settings.maxLoginAttempts) {
      const lockedUntil = new Date(Date.now() + settings.lockoutPeriodMinutes * 60 * 1000);
      await this.userRepository.update(user.id, {
        failedLoginCount: newCount,
        lockedUntil,
      });
    } else {
      await this.userRepository.update(user.id, {
        failedLoginCount: newCount,
      });
    }
  }
}
