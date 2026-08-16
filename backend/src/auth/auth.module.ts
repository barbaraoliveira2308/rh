import { Global, Module, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { JwtService, EncryptionService } from './services';
import { MfaService } from './services/mfa.service';
import { EmployeeIdentityService } from './services/employee-identity.service';
import { JwtAuthGuard, SESSION_VALIDATOR } from './guards';
import { SessionValidator } from './guards/jwt-auth.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { AuthAuditInterceptor, AUDIT_EVENT_HANDLER } from './interceptors/auth-audit.interceptor';
import { CacheService } from '../cache/cache.service';
import { KeycloakModule } from './keycloak/keycloak.module';
import { Employee } from '../users/entities/employee.entity';
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
      Employee,
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
    EmployeeIdentityService,
    AuthAuditInterceptor,
    RateLimitGuard,
    {
      provide: JwtAuthGuard,
      useFactory: (
        jwtService: JwtService,
        cacheService: CacheService,
        reflector: Reflector,
      ): JwtAuthGuard => {
        return new JwtAuthGuard(
          jwtService,
          {
            isSessionActive: (tokenHash: string) => cacheService.exists(`session:${tokenHash}`),
            invalidateSession: (tokenHash: string) => cacheService.del(`session:${tokenHash}`),
          },
          reflector,
        );
      },
      inject: [JwtService, CacheService, Reflector],
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
        const logger = new Logger('AuthAudit');
        return (event: unknown): void => {
          logger.log(JSON.stringify(event));
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
    EmployeeIdentityService,
    TypeOrmModule,
  ],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AuthModule {}
