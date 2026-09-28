import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PoliciesController } from './policies.controller';
import { PoliciesService } from './policies.service';
import { Policy } from './entities/policy.entity';
import { PolicyAcceptance } from './entities/policy-acceptance.entity';
import { User } from '../auth/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Policy, PolicyAcceptance, User])],
  controllers: [PoliciesController],
  providers: [PoliciesService],
  exports: [PoliciesService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class PoliciesModule {}
