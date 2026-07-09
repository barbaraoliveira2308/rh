import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ReportsRabbitmqService, ReportJobMessage } from './reports-rabbitmq.service';
import { ReportsService } from './reports.service';
import { ScheduledReportsService } from './scheduled-reports.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportJob } from '../entities/report-job.entity';
import { ScheduledReport } from '../entities/scheduled-report.entity';
import { ReportJobStatus } from '../entities/report-job-status.enum';

@Injectable()
export class ReportsConsumerService implements OnModuleInit {
  private readonly logger = new Logger(ReportsConsumerService.name);

  constructor(
    private readonly rabbitmq: ReportsRabbitmqService,
    private readonly reportsService: ReportsService,
    private readonly scheduledReportsService: ScheduledReportsService,
    @InjectRepository(ReportJob)
    private readonly jobRepository: Repository<ReportJob>,
    @InjectRepository(ScheduledReport)
    private readonly scheduledRepository: Repository<ScheduledReport>,
  ) {}

  onModuleInit(): void {
    void this.rabbitmq.consume(async (message) => this.handleMessage(message));
  }

  private async handleMessage(message: ReportJobMessage): Promise<void> {
    this.logger.log('Processing report job ' + message.jobId);

    await this.reportsService.updateJobStatus(message.jobId, ReportJobStatus.PROCESSING);

    try {
      const buffer = await this.reportsService.generateBuffer(
        message.reportType,
        message.filters,
        message.format,
      );

      const job = await this.jobRepository.findOne({ where: { id: message.jobId } });

      if (job?.scheduledReportId) {
        const scheduled = await this.scheduledRepository.findOne({
          where: { id: job.scheduledReportId },
        });

        if (scheduled) {
          const filename = message.reportType + '.' + message.format;
          await this.scheduledReportsService.sendCompletedReport(
            scheduled.recipients,
            'Relatório agendado: ' + scheduled.name,
            buffer,
            filename,
          );
        }
      }

      await this.reportsService.updateJobStatus(message.jobId, ReportJobStatus.COMPLETED, {
        rowCount: 0,
      });
    } catch (error) {
      this.logger.error(
        'Failed to process report job ' +
          message.jobId +
          ': ' +
          (error instanceof Error ? error.message : String(error)),
      );

      await this.reportsService.updateJobStatus(message.jobId, ReportJobStatus.FAILED, {
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
