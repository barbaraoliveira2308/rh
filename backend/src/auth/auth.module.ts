import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { JwtService, EncryptionService } from './services';
import { JwtAuthGuard, SESSION_VALIDATOR } from './guards';
import { CacheService } from '../cache/cache.service';
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
  ],
  controllers: [AuthController],
  providers: [
    JwtService,
    EncryptionService,
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
  ],
  exports: [JwtService, EncryptionService, JwtAuthGuard, TypeOrmModule],
})
export class AuthModule {}
