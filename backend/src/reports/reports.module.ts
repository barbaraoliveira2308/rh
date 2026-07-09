import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './services/reports.service';
import { ReportExportersService } from './services/report-exporters.service';
import { ReportsRabbitmqService } from './services/reports-rabbitmq.service';
import { ScheduledReportsService } from './services/scheduled-reports.service';
import { ReportsConsumerService } from './services/reports-consumer.service';
import { ScheduledReport } from './entities/scheduled-report.entity';
import { ReportJob } from './entities/report-job.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ScheduledReport, ReportJob])],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    ReportExportersService,
    ReportsRabbitmqService,
    ScheduledReportsService,
    ReportsConsumerService,
  ],
  exports: [ReportsService, ScheduledReportsService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ReportsModule {}
