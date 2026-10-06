import { Global, Module, Logger } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reflector } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { SessionActivityController } from './session-activity.controller';
import { AuthService } from './services/auth.service';
import { JwtService, EncryptionService } from './services';
import { MfaService } from './services/mfa.service';
import { SessionsService } from './services/sessions.service';
import { EmployeeIdentityService } from './services/employee-identity.service';
import { JwtAuthGuard, SESSION_VALIDATOR } from './guards';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { RateLimitStoreService } from './rate-limit/rate-limit-store.service';
import { RedisRateLimitStore } from './rate-limit/redis-rate-limit.store';
import {
  DEFAULT_RATE_LIMIT_KEY_PREFIX,
  RATE_LIMIT_KEY_PREFIX,
} from './rate-limit/rate-limit-store';
import {
  AuthAuditInterceptor,
  AUDIT_EVENT_HANDLER,
  AuditEvent,
  AuditEventHandler,
} from './interceptors/auth-audit.interceptor';
import { Employee } from '../users/entities/employee.entity';
import { AuditModule } from '../audit/audit.module';
import { AuditService } from '../audit/services/audit.service';
import { NotificationsModule } from '../notifications/notifications.module';
import {
  User,
  Session,
  Role,
  Permission,
  RolePermission,
  UserRole,
  PasswordResetToken,
  PasswordHistory,
  ApiKey,
  MfaRecoveryCode,
} from './entities';

const AUTH_ACTION_BY_HANDLER: Record<string, string> = {
  login: 'LOGIN',
  loginMfa: 'LOGIN',
  logout: 'LOGOUT',
  changePassword: 'PASSWORD_CHANGED',
  verifyMfa: 'MFA_ENABLED',
  disableMfa: 'MFA_DISABLED',
  regenerateRecoveryCodes: 'MFA_RECOVERY_CODES_REGENERATED',
};

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
      PasswordHistory,
      ApiKey,
      MfaRecoveryCode,
      Employee,
    ]),
    AuditModule,
    NotificationsModule,
  ],
  controllers: [AuthController, SessionActivityController],
  providers: [
    AuthService,
    JwtService,
    EncryptionService,
    MfaService,
    SessionsService,
    EmployeeIdentityService,
    AuthAuditInterceptor,
    RateLimitGuard,
    RateLimitStoreService,
    RedisRateLimitStore,
    { provide: RATE_LIMIT_KEY_PREFIX, useValue: DEFAULT_RATE_LIMIT_KEY_PREFIX },
    {
      provide: JwtAuthGuard,
      useFactory: (
        jwtService: JwtService,
        sessions: SessionsService,
        reflector: Reflector,
      ): JwtAuthGuard => {
        return new JwtAuthGuard(jwtService, sessions, reflector);
      },
      inject: [JwtService, SessionsService, Reflector],
    },
    {
      provide: SESSION_VALIDATOR,
      useExisting: SessionsService,
    },
    {
      provide: AUDIT_EVENT_HANDLER,
      useFactory: (
        auditService: AuditService,
        userRepository: Repository<User>,
      ): AuditEventHandler => {
        const logger = new Logger('AuthAudit');

        return (event: AuditEvent): void => {
          logger.log(JSON.stringify(event));

          const userAgent = event.metadata?.userAgent as string | undefined;

          if (!event.success) {
            if (event.handlerName !== 'login' || !event.email) {
              return;
            }
            userRepository
              .findOneBy({ email: event.email })
              .then((user) => {
                if (!user) return;
                auditService.log({
                  action: 'LOGIN_FAILED',
                  entityType: 'User',
                  entityId: user.id,
                  ipAddress: event.ip,
                  userAgent,
                  module: 'auth',
                });
              })
              .catch(() => undefined);
            return;
          }

          const action = AUTH_ACTION_BY_HANDLER[event.handlerName];
          if (!action || !event.userId) {
            return;
          }

          auditService.log({
            userId: event.userId,
            action,
            entityType: 'User',
            entityId: event.userId,
            ipAddress: event.ip,
            userAgent,
            module: 'auth',
          });
        };
      },
      inject: [AuditService, getRepositoryToken(User)],
    },
  ],
  exports: [
    AuthService,
    JwtService,
    EncryptionService,
    JwtAuthGuard,
    SESSION_VALIDATOR,
    RateLimitStoreService,
    EmployeeIdentityService,
    TypeOrmModule,
  ],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AuthModule {}
