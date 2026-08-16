import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { JwtService } from '../services/jwt.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { ALLOW_MFA_SETUP_KEY } from '../decorators/allow-mfa-setup.decorator';

export interface SessionValidator {
  isSessionActive(tokenHash: string): Promise<boolean>;
  invalidateSession(tokenHash: string): Promise<void>;
}

export const SESSION_VALIDATOR = 'SESSION_VALIDATOR';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(SESSION_VALIDATOR)
    private readonly sessionValidator: SessionValidator,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Token de autenticação não fornecido');
    }

    const payload: JwtPayload = this.jwtService.verifyAccessToken(token);

    const tokenHash = this.jwtService.computeTokenHash(token);
    const isActive = await this.sessionValidator.isSessionActive(tokenHash);

    if (!isActive) {
      throw new UnauthorizedException('Sessão inválida ou expirada');
    }

    request.user = payload;

    if (payload.mfaSetupRequired) {
      const allowsMfaSetup = this.reflector.getAllAndOverride<boolean | undefined>(
        ALLOW_MFA_SETUP_KEY,
        [context.getHandler(), context.getClass()],
      );

      if (!allowsMfaSetup) {
        throw new ForbiddenException(
          'Configuração de MFA obrigatória antes de aceder a este recurso',
        );
      }
    }

    return true;
  }

  private extractToken(request: Request): string | null {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return null;
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      return null;
    }

    return token;
  }
}
