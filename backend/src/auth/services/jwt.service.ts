import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'node:crypto';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { User } from '../entities/user.entity';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class JwtService {
  private readonly accessPrivateKey: string;
  private readonly accessPublicKey: string;
  private readonly refreshPrivateKey: string;
  private readonly refreshPublicKey: string;
  private readonly accessExpiresIn: string;
  private readonly refreshExpiresIn: string;

  constructor(configService: ConfigService) {
    this.accessPrivateKey = this.decodeKey(
      configService.get<string>('JWT_ACCESS_PRIVATE_KEY'),
      'JWT_ACCESS_PRIVATE_KEY',
    );
    this.accessPublicKey = this.decodeKey(
      configService.get<string>('JWT_ACCESS_PUBLIC_KEY'),
      'JWT_ACCESS_PUBLIC_KEY',
    );
    this.refreshPrivateKey = this.decodeKey(
      configService.get<string>('JWT_REFRESH_PRIVATE_KEY'),
      'JWT_REFRESH_PRIVATE_KEY',
    );
    this.refreshPublicKey = this.decodeKey(
      configService.get<string>('JWT_REFRESH_PUBLIC_KEY'),
      'JWT_REFRESH_PUBLIC_KEY',
    );
    this.accessExpiresIn = configService.get<string>('JWT_EXPIRES_IN', '15m');
    this.refreshExpiresIn = configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
  }

  private decodeKey(base64Value: string | undefined, envVarName: string): string {
    if (!base64Value) {
      throw new Error(`${envVarName} não configurado`);
    }
    return Buffer.from(base64Value, 'base64').toString('utf8');
  }

  generateAccessToken(
    user: Pick<User, 'id' | 'email' | 'username'>,
    roles: string[],
    mfaSetupRequired = false,
  ): string {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      username: user.username,
      roles,
      jti: crypto.randomUUID(),
      ...(mfaSetupRequired ? { mfaSetupRequired: true } : {}),
    };

    return jwt.sign(payload, this.accessPrivateKey, {
      algorithm: 'RS256',
      expiresIn: this.accessExpiresIn as jwt.SignOptions['expiresIn'],
    });
  }

  generateRefreshToken(user: Pick<User, 'id'>): string {
    const payload = {
      sub: user.id,
      jti: crypto.randomUUID(),
      type: 'refresh' as const,
    };

    return jwt.sign(payload, this.refreshPrivateKey, {
      algorithm: 'RS256',
      expiresIn: this.refreshExpiresIn as jwt.SignOptions['expiresIn'],
    });
  }

  generateTokenPair(
    user: Pick<User, 'id' | 'email' | 'username'>,
    roles: string[],
    mfaSetupRequired = false,
  ): TokenPair {
    return {
      accessToken: this.generateAccessToken(user, roles, mfaSetupRequired),
      refreshToken: this.generateRefreshToken(user),
    };
  }

  verifyAccessToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, this.accessPublicKey, {
        algorithms: ['RS256'],
      }) as JwtPayload;
      return decoded;
    } catch {
      throw new UnauthorizedException('Token de acesso inválido ou expirado');
    }
  }

  verifyRefreshToken(token: string): { sub: string; jti: string } {
    try {
      const decoded = jwt.verify(token, this.refreshPublicKey, {
        algorithms: ['RS256'],
      }) as {
        sub: string;
        jti: string;
        type: string;
      };
      if (decoded.type !== 'refresh') {
        throw new UnauthorizedException('Tipo de token inválido');
      }
      return { sub: decoded.sub, jti: decoded.jti };
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }
  }

  computeTokenHash(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
