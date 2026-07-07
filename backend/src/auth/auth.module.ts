import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { JwtService, EncryptionService } from './services';
import { MfaService } from './services/mfa.service';
import { JwtAuthGuard, SESSION_VALIDATOR } from './guards';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { AuthAuditInterceptor, AUDIT_EVENT_HANDLER } from './interceptors/auth-audit.interceptor';
import { CacheService } from '../cache/cache.service';
import { KeycloakModule } from './keycloak/keycloak.module';
import {
  User,
  Session,
  Role,
  Permission,
  RolePermission,
  UserRole,
  PasswordResetToken,
  ApiKey,
} from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Session,
      Role,
      Permission,
      RolePermission,
      UserRole,
      PasswordResetToken,
      ApiKey,
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    KeycloakModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtService,
    EncryptionService,
    MfaService,
    AuthAuditInterceptor,
    RateLimitGuard,
    {
      provide: JwtAuthGuard,
      useFactory: (jwtService: JwtService, cacheService: CacheService) => {
        return new JwtAuthGuard(jwtService, {
          isSessionActive: (tokenHash: string) => cacheService.exists(tokenHash),
          invalidateSession: (tokenHash: string) => cacheService.del(tokenHash),
        });
      },
      inject: [JwtService, CacheService],
    },
    {
      provide: SESSION_VALIDATOR,
      useFactory: (cacheService: CacheService) => ({
        isSessionActive: (tokenHash: string) => cacheService.exists(tokenHash),
        invalidateSession: (tokenHash: string) => cacheService.del(tokenHash),
      }),
      inject: [CacheService],
    },
    {
      provide: AUDIT_EVENT_HANDLER,
      useFactory: () => {
        return (event: unknown): void => {
          console.log('[Audit]', JSON.stringify(event));
        };
      },
    },
  ],
  exports: [
    AuthService,
    JwtService,
    EncryptionService,
    JwtAuthGuard,
    TypeOrmModule,
  ],
})
export class AuthModule {}
