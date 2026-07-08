import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { JwtService, EncryptionService } from './services';
import { MfaService } from './services/mfa.service';
import { JwtAuthGuard, SESSION_VALIDATOR } from './guards';
import { SessionValidator } from './guards/jwt-auth.guard';
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

@Global()
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
      useFactory: (jwtService: JwtService, cacheService: CacheService): JwtAuthGuard => {
        return new JwtAuthGuard(jwtService, {
          isSessionActive: (tokenHash: string) => cacheService.exists(`session:${tokenHash}`),
          invalidateSession: (tokenHash: string) => cacheService.del(`session:${tokenHash}`),
        });
      },
      inject: [JwtService, CacheService],
    },
    {
      provide: SESSION_VALIDATOR,
      useFactory: (cacheService: CacheService): SessionValidator => ({
        isSessionActive: (tokenHash: string) => cacheService.exists(`session:${tokenHash}`),
        invalidateSession: (tokenHash: string) => cacheService.del(`session:${tokenHash}`),
      }),
      inject: [CacheService],
    },
    {
      provide: AUDIT_EVENT_HANDLER,
      useFactory: (): ((event: unknown) => void) => {
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
    SESSION_VALIDATOR,
    TypeOrmModule,
  ],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AuthModule {}
