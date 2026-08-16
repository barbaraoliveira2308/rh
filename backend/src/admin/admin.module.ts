import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { SystemSetting } from './entities/system-setting.entity';
import { LegalEntity } from './entities/legal-entity.entity';
import { AuditModule } from '../audit/audit.module';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([SystemSetting, LegalEntity]), AuditModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AdminModule {}
