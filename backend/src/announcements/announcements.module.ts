import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from '../storage/storage.module';
import { Employee } from '../users/entities/employee.entity';
import { Announcement } from './entities/announcement.entity';
import { AnnouncementAsset } from './entities/announcement-asset.entity';
import { AnnouncementForm } from './entities/announcement-form.entity';
import { AnnouncementFormResponse } from './entities/announcement-form-response.entity';
import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';

@Module({
  imports: [
    StorageModule,
    TypeOrmModule.forFeature([
      Announcement,
      AnnouncementAsset,
      AnnouncementForm,
      AnnouncementFormResponse,
      Employee,
    ]),
  ],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AnnouncementsModule {}
