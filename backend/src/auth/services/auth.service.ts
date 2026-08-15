import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { ConfigService } from '@nestjs/config';
import { User } from '../entities/user.entity';
import { Session } from '../entities/session.entity';
import { UserRole } from '../entities/user-role.entity';
import { JwtService } from './jwt.service';
import { MfaService } from './mfa.service';
import { CacheService } from '../../cache/cache.service';
import { AdminService } from '../../admin/admin.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly jwtService: JwtService,
    private readonly mfaService: MfaService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
    private readonly adminService: AdminService,
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

    const tokens = this.jwtService.generateTokenPair(user, roles);

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

    await this.cacheService.del(`refresh:${oldRefreshHash}`);

    const user = await this.userRepository.findOneBy({ id: payload.sub });
    if (!user?.isActive) {
      throw new UnauthorizedException('Utilizador não encontrado ou inativo');
    }

    const userRoles = await this.userRoleRepository.find({
      where: { userId: user.id },
      relations: { role: true },
    });
    const roles = userRoles.map((ur) => ur.role.name);

    const newAccessToken = this.jwtService.generateAccessToken(user, roles);
    const newRefreshToken = this.jwtService.generateRefreshToken(user);

    const newAccessHash = this.jwtService.computeTokenHash(newAccessToken);
    const newRefreshHash = this.jwtService.computeTokenHash(newRefreshToken);

    const parsed = JSON.parse(sessionData) as { userId: string; sessionId: string };

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

  async enableMfa(userId: string): Promise<{ secret: string; qrCodeUrl: string }> {
    const { secret, encryptedSecret, qrCodeUrl } = this.mfaService.generateSecret(userId);

    await this.userRepository.update(userId, {
      mfaSecret: encryptedSecret,
      mfaEnabled: false,
    });

    return { secret, qrCodeUrl };
  }

  async verifyMfa(userId: string, code: string): Promise<void> {
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
  }

  async disableMfa(userId: string, code: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'mfaSecret'],
    });

    if (!user?.mfaSecret) {
      throw new BadRequestException('MFA não está configurado');
    }

    const isValid = this.mfaService.validateToken(user.mfaSecret, code);

    if (!isValid) {
      throw new BadRequestException('Código MFA inválido');
    }

    await this.userRepository.update(userId, {
      mfaSecret: null,
      mfaEnabled: false,
    });
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

    const newHash = await argon2.hash(newPassword);
    await this.userRepository.update(userId, {
      passwordHash: newHash,
      passwordChangedAt: new Date(),
    });

    await this.sessionRepository.update({ userId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  async resetPassword(email: string): Promise<void> {
    const user = await this.userRepository.findOneBy({ email });
    if (!user) {
      return;
    }
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
