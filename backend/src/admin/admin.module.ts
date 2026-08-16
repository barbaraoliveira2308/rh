import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { SystemSetting } from './entities/system-setting.entity';
import { LegalEntity } from './entities/legal-entity.entity';
import { User } from '../auth/entities/user.entity';
import { Contract } from '../contracts/entities/contract.entity';
import { AuditModule } from '../audit/audit.module';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([SystemSetting, LegalEntity, User, Contract]), AuditModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AdminModule {}
