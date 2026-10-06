import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Or, Repository } from 'typeorm';
import * as argon2 from 'argon2';
import * as crypto from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { User } from '../entities/user.entity';
import { UserRole } from '../entities/user-role.entity';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { PasswordHistory } from '../entities/password-history.entity';
import { MfaRecoveryCode } from '../entities/mfa-recovery-code.entity';
import { JwtService } from './jwt.service';
import { MfaService } from './mfa.service';
import { SessionsService } from './sessions.service';
import { CacheService } from '../../cache/cache.service';
import { AdminService } from '../../admin/admin.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { AuditService } from '../../audit/services/audit.service';

const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const PASSWORD_HISTORY_ENTRIES_KEPT = 4;
const MFA_CHALLENGE_TTL_MS = 5 * 60 * 1000;
// Validade da sessão e do refresh token; renovada a cada refresh, como a chave em cache fazia.
const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

const LOGIN_USER_FIELDS: (keyof User)[] = [
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
];

export interface LoginSuccess {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; username: string; roles: string[] };
  mfaSetupRequired: boolean;
  // BR-AUTH-005: o frontend usa-o para terminar a sessão no browser após inatividade.
  sessionTimeoutMinutes: number;
}

export interface MfaChallenge {
  mfaRequired: true;
  challengeToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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
    private readonly sessions: SessionsService,
    // Só para o desafio MFA do login (decisão P107-11); as sessões vivem em hr.sessions.
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
    private readonly adminService: AdminService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  async login(
    email: string,
    password: string,
    ip?: string,
    userAgent?: string,
  ): Promise<LoginSuccess | MfaChallenge> {
    const user = await this.userRepository.findOne({
      where: { email },
      select: LOGIN_USER_FIELDS,
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    this.assertCanAuthenticate(user);

    const passwordValid = await argon2.verify(user.passwordHash, password);
    if (!passwordValid) {
      await this.registerFailedAttempt(user);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // UC-AUTH-001 passo 4: com MFA ativo a password não chega para abrir sessão. O desafio fica
    // no servidor; o browser guarda só o token, nunca a password (decisão P093-01). O contador
    // de falhas também não é reposto aqui — só quando a sessão é emitida —, senão alternar
    // password certa e código errado dava tentativas ilimitadas ao código.
    if (user.mfaEnabled) {
      if (!user.mfaSecret) {
        throw new BadRequestException('MFA não configurado');
      }
      const challengeToken = crypto.randomBytes(32).toString('hex');
      await this.cacheService.set(
        this.mfaChallengeKey(challengeToken),
        user.id,
        MFA_CHALLENGE_TTL_MS,
      );
      return { mfaRequired: true, challengeToken };
    }

    return this.issueSession(user, ip, userAgent);
  }

  async loginMfa(
    challengeToken: string,
    code: string,
    ip?: string,
    userAgent?: string,
  ): Promise<LoginSuccess> {
    const challengeKey = this.mfaChallengeKey(challengeToken);
    const userId = await this.cacheService.get(challengeKey);
    if (!userId) {
      throw new UnauthorizedException('Pedido de verificação expirado. Inicie sessão novamente.');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: LOGIN_USER_FIELDS,
    });
    if (!user?.mfaEnabled || !user.mfaSecret) {
      await this.cacheService.del(challengeKey);
      throw new UnauthorizedException('Pedido de verificação inválido. Inicie sessão novamente.');
    }

    try {
      this.assertCanAuthenticate(user);
    } catch (err) {
      await this.cacheService.del(challengeKey);
      throw err;
    }

    const isValid = await this.verifySecondFactor(user.id, user.mfaSecret, code);
    if (!isValid) {
      // UC-AUTH-001 fluxo alternativo 4a: rejeitar e registar a tentativa falhada. Conta para o
      // mesmo bloqueio que as passwords erradas (BR-AUTH-002).
      this.auditService.log({
        userId: user.id,
        action: 'LOGIN_MFA_FAILED',
        entityType: 'User',
        entityId: user.id,
        ipAddress: ip,
        userAgent,
        module: 'auth',
      });
      try {
        await this.registerFailedAttempt(user);
      } catch (err) {
        await this.cacheService.del(challengeKey);
        throw err;
      }
      throw new UnauthorizedException('Código MFA inválido');
    }

    await this.cacheService.del(challengeKey);
    return this.issueSession(user, ip, userAgent);
  }

  private assertCanAuthenticate(user: User): void {
    if (!user.isActive) {
      throw new ForbiddenException('Conta desativada');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException('Conta bloqueada temporariamente');
    }
  }

  private mfaChallengeKey(challengeToken: string): string {
    return `mfa-challenge:${this.jwtService.computeTokenHash(challengeToken)}`;
  }

  private async issueSession(user: User, ip?: string, userAgent?: string): Promise<LoginSuccess> {
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

    await this.sessions.create(
      user.id,
      accessHash,
      refreshHash,
      new Date(Date.now() + SESSION_LIFETIME_MS),
      { ipAddress: ip ?? 'unknown', userAgent: userAgent ?? null },
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
      sessionTimeoutMinutes: await this.sessions.timeoutMinutes(),
    };
  }

  async logout(tokenHash: string): Promise<void> {
    const session = await this.sessions.findByTokenHash(tokenHash);
    if (session) {
      await this.sessions.revoke(session.id);
    }
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = this.jwtService.verifyRefreshToken(refreshToken);
    const oldRefreshHash = this.jwtService.computeTokenHash(refreshToken);

    // Um refresh token já rodado deixa de estar na linha da sessão e não é encontrado.
    const session = await this.sessions.findByRefreshTokenHash(oldRefreshHash);
    if (!session || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    // Logout, troca/reset de password e MFA revogam a sessão (UC-AUTH-004).
    if (session.revokedAt) {
      throw new UnauthorizedException('Sessão revogada ou inexistente');
    }

    // BR-AUTH-005: o refresh não conta como atividade (o frontend também o faz a partir do
    // polling) e não reanima uma sessão já inativa — revoga-a.
    if (!(await this.sessions.isActive(session.id))) {
      await this.sessions.revoke(session.id);
      throw new UnauthorizedException('Sessão terminada por inatividade');
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

    // O access token anterior deixa de ser aceite: a linha só guarda o hash do mais recente.
    const rotated = await this.sessions.rotate(
      session.id,
      oldRefreshHash,
      newAccessHash,
      newRefreshHash,
      new Date(Date.now() + SESSION_LIFETIME_MS),
    );
    if (!rotated) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

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
      mfaLastUsedStep: null,
    });

    return { secret, qrCodeUrl, qrCodeDataUrl };
  }

  async verifyMfa(
    userId: string,
    code: string,
    currentTokenHash?: string,
  ): Promise<{ recoveryCodes: string[] }> {
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

    const isValid = await this.consumeTotp(userId, user.mfaSecret, code);

    if (!isValid) {
      throw new BadRequestException('Código MFA inválido');
    }

    await this.userRepository.update(userId, { mfaEnabled: true });
    // R-065: sessões abertas antes do MFA noutros dispositivos não passaram pelo segundo fator.
    await this.endSessions(userId, currentTokenHash);

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
    if (!(await this.consumeTotp(userId, user.mfaSecret, code))) {
      throw new BadRequestException('Código MFA inválido');
    }

    const recoveryCodes = await this.replaceRecoveryCodes(userId);
    return { recoveryCodes };
  }

  async disableMfa(
    userId: string,
    code: string,
    currentTokenHash?: string,
  ): Promise<{ sessionEnded: boolean }> {
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
      mfaLastUsedStep: null,
    });
    await this.mfaRecoveryCodeRepository.delete({ userId });

    // R-065: para um admin com MFA obrigatório, desativar termina também a sessão corrente — no
    // login seguinte tem de voltar a configurar o MFA, sem janela em que opera sem ele. Continua a
    // ser permitido, porque é o caminho de quem perdeu o telemóvel (decisão P095-02).
    const roles = await this.findRoleNames(userId);
    const mandatory = await this.isMfaMandatory(roles);
    await this.endSessions(userId, mandatory ? undefined : currentTokenHash);
    return { sessionEnded: mandatory };
  }

  // Revoga as sessões ativas do utilizador, exceto a indicada; os access tokens deixam de
  // funcionar logo, porque o JwtAuthGuard valida cada pedido contra hr.sessions.
  private async endSessions(userId: string, keepTokenHash?: string): Promise<void> {
    const kept = keepTokenHash ? await this.sessions.findByTokenHash(keepTokenHash) : null;
    await this.sessions.revokeAllForUser(userId, kept?.id);
  }

  // R-065: um código TOTP só é aceite uma vez. O UPDATE condicional grava o passo usado e falha se
  // esse passo (ou um posterior) já tiver sido aceite, incluindo em dois pedidos simultâneos.
  private async consumeTotp(
    userId: string,
    encryptedSecret: string,
    code: string,
  ): Promise<boolean> {
    const step = this.mfaService.matchTotpStep(encryptedSecret, code.trim());
    if (step === null) {
      return false;
    }

    const result = await this.userRepository.update(
      { id: userId, mfaLastUsedStep: Or(IsNull(), LessThan(step)) },
      { mfaLastUsedStep: step },
    );
    return (result.affected ?? 0) > 0;
  }

  private async verifySecondFactor(
    userId: string,
    encryptedSecret: string,
    code: string,
  ): Promise<boolean> {
    if (this.mfaService.isTotpCode(code)) {
      return this.consumeTotp(userId, encryptedSecret, code);
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

    // Decisão P107-06: termina todas as sessões, incluindo a de quem trocou a password.
    await this.sessions.revokeAllForUser(userId);
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

    // FRONTEND_URL: este link é para o utilizador, tem de apontar para a SPA e não para a API.
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

    await this.sessions.revokeAllForUser(resetToken.userId);

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
    mfaRequired: boolean;
    lastLoginAt: Date | null;
    roles: string[];
  }> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new UnauthorizedException('Utilizador não encontrado');
    }

    const roles = await this.findRoleNames(userId);

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      isActive: user.isActive,
      mfaEnabled: user.mfaEnabled,
      mfaRequired: await this.isMfaMandatory(roles),
      lastLoginAt: user.lastLoginAt,
      roles,
    };
  }

  private async findRoleNames(userId: string): Promise<string[]> {
    const userRoles = await this.userRoleRepository.find({
      where: { userId },
      relations: { role: true },
    });
    return userRoles.map((ur) => ur.role.name);
  }

  private async isMfaMandatory(roles: string[]): Promise<boolean> {
    if (!roles.includes('admin')) {
      return false;
    }
    const settings = await this.adminService.getSettings();
    return settings.mfaRequiredForAdmin;
  }

  private async isMfaSetupRequired(
    user: Pick<User, 'mfaEnabled'>,
    roles: string[],
  ): Promise<boolean> {
    return !user.mfaEnabled && (await this.isMfaMandatory(roles));
  }

  // Incrementa o contador e bloqueia ao atingir o limite. A tentativa que provoca o bloqueio já
  // devolve 403, como o fluxo alternativo 2a e a secção Erros pedem (antes devolvia 401 e só a
  // seguinte recebia 403).
  private async registerFailedAttempt(user: User): Promise<void> {
    const settings = await this.adminService.getSettings();
    const newCount = user.failedLoginCount + 1;

    if (newCount >= settings.maxLoginAttempts) {
      const lockedUntil = new Date(Date.now() + settings.lockoutPeriodMinutes * 60 * 1000);
      await this.userRepository.update(user.id, {
        failedLoginCount: newCount,
        lockedUntil,
      });
      throw new ForbiddenException('Conta bloqueada temporariamente');
    }

    await this.userRepository.update(user.id, {
      failedLoginCount: newCount,
    });
  }
}
