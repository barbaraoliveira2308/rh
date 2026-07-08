import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { User } from '../entities/user.entity';
import { KeycloakService } from './keycloak.service';
import { KeycloakStrategy } from './keycloak.strategy';

@Module({
  imports: [TypeOrmModule.forFeature([User]), PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [KeycloakService, KeycloakStrategy],
  exports: [KeycloakService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class KeycloakModule {}
