import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { SystemSetting } from './entities/system-setting.entity';
import { LegalEntity } from './entities/legal-entity.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SystemSetting, LegalEntity])],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AdminModule {}
