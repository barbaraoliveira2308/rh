import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as nodemailer from 'nodemailer';
import { ScheduledReport } from '../entities/scheduled-report.entity';
import { ReportFrequency } from '../entities/report-frequency.enum';
import { ReportFormat } from '../entities/report-format.enum';
import { ReportsService } from './reports.service';
import { ReportsRabbitmqService } from './reports-rabbitmq.service';
import { CreateScheduledReportDto } from '../dto/create-scheduled-report.dto';
import { UpdateScheduledReportDto } from '../dto/update-scheduled-report.dto';
import { ScheduledReportResponseDto } from '../dto/scheduled-report-response.dto';

@Injectable()
export class ScheduledReportsService {
  private readonly logger = new Logger(ScheduledReportsService.name);
  private readonly transporter: nodemailer.Transporter | null = null;

  constructor(
    @InjectRepository(ScheduledReport)
    private readonly scheduledRepository: Repository<ScheduledReport>,
    private readonly reportsService: ReportsService,
    private readonly rabbitmq: ReportsRabbitmqService,
  ) {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;

    if (smtpHost) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        auth: {
          user: process.env.SMTP_USER ?? '',
          pass: process.env.SMTP_PASS ?? '',
        },
      });
    }
  }

  async create(dto: CreateScheduledReportDto): Promise<ScheduledReportResponseDto> {
    const scheduled = this.scheduledRepository.create({
      name: dto.name,
      reportType: dto.reportType,
      filters: dto.filters,
      frequency: dto.frequency,
      recipients: dto.recipients,
      format: dto.format,
      nextRunAt: this.calculateNextRun(dto.frequency),
      isActive: true,
    });

    const saved = await this.scheduledRepository.save(scheduled);
    return this.mapToResponse(saved);
  }

  async findAll(): Promise<ScheduledReportResponseDto[]> {
    const items = await this.scheduledRepository.find({ order: { createdAt: 'DESC' } });
    return items.map((item) => this.mapToResponse(item));
  }

  async update(id: string, dto: UpdateScheduledReportDto): Promise<ScheduledReportResponseDto> {
    const item = await this.scheduledRepository.findOne({ where: { id } });

    if (!item) {
      throw new NotFoundException('Tarefa agendada não encontrada');
    }

    Object.assign(item, dto);

    if (dto.frequency) {
      item.nextRunAt = this.calculateNextRun(dto.frequency);
    }

    const saved = await this.scheduledRepository.save(item);
    return this.mapToResponse(saved);
  }

  async remove(id: string): Promise<void> {
    const item = await this.scheduledRepository.findOne({ where: { id } });

    if (!item) {
      throw new Error('Tarefa agendada não encontrada');
    }

    await this.scheduledRepository.remove(item);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async runScheduled(): Promise<void> {
    const now = new Date();
    const dueItems = await this.scheduledRepository.find({
      where: {
        isActive: true,
        nextRunAt: LessThan(now),
      },
    });

    for (const item of dueItems) {
      try {
        await this.processScheduled(item);
      } catch (error) {
        this.logger.error(
          'Failed to run scheduled report ' +
            item.id +
            ': ' +
            (error instanceof Error ? error.message : String(error)),
        );
      }
    }
  }

  private async processScheduled(item: ScheduledReport): Promise<void> {
    const job = await this.reportsService.createJob(
      item.reportType,
      item.filters,
      item.format as ReportFormat,
      item.id,
    );

    this.rabbitmq.publishReportJob(
      job.id,
      item.reportType,
      item.filters,
      item.format as ReportFormat,
    );

    item.lastRunAt = new Date();
    item.nextRunAt = this.calculateNextRun(item.frequency);
    await this.scheduledRepository.save(item);
  }

  async sendCompletedReport(
    recipients: string[],
    subject: string,
    buffer: Buffer,
    filename: string,
  ): Promise<void> {
    if (!this.transporter) {
      this.logger.warn('SMTP not configured; scheduled report email not sent');
      return;
    }

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM ?? 'noreply@hr-suite.local',
        to: recipients,
        subject,
        text: 'Segue em anexo o relatório agendado.',
        attachments: [
          {
            filename,
            content: buffer,
          },
        ],
      });
    } catch (error) {
      this.logger.error(
        'Failed to send scheduled report email: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  private calculateNextRun(frequency: ReportFrequency): Date {
    const now = new Date();

    switch (frequency) {
      case ReportFrequency.DAILY:
        now.setDate(now.getDate() + 1);
        break;
      case ReportFrequency.WEEKLY:
        now.setDate(now.getDate() + 7);
        break;
      case ReportFrequency.MONTHLY:
        now.setMonth(now.getMonth() + 1);
        break;
    }

    return now;
  }

  private mapToResponse(item: ScheduledReport): ScheduledReportResponseDto {
    return {
      id: item.id,
      name: item.name,
      reportType: item.reportType,
      frequency: item.frequency,
      recipients: item.recipients,
      format: item.format,
      nextRunAt: item.nextRunAt,
      lastRunAt: item.lastRunAt,
      isActive: item.isActive,
      createdAt: item.createdAt,
    };
  }
}
