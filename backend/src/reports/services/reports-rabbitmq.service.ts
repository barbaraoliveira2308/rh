import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { ReportType } from '../entities/report-type.enum';
import { ReportFormat } from '../entities/report-format.enum';

export interface ReportJobMessage {
  jobId: string;
  reportType: ReportType;
  filters: Record<string, unknown>;
  format: ReportFormat;
}

interface AmqpConnection {
  createChannel: () => Promise<AmqpChannel>;
  close: () => Promise<void>;
}

interface AmqpChannel {
  assertQueue: (queue: string, options?: Record<string, unknown>) => Promise<unknown>;
  sendToQueue: (queue: string, content: Buffer, options?: Record<string, unknown>) => boolean;
  consume: (
    queue: string,
    callback: (message: AmqpMessage | null) => void,
    options?: Record<string, unknown>,
  ) => Promise<unknown>;
  ack: (message: AmqpMessage) => void;
  nack: (message: AmqpMessage, allUpTo?: boolean, requeue?: boolean) => void;
  close: () => Promise<void>;
}

interface AmqpMessage {
  content: Buffer;
}

@Injectable()
export class ReportsRabbitmqService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReportsRabbitmqService.name);
  private readonly queueName = 'report_jobs';
  private connection: AmqpConnection | null = null;
  private channel: AmqpChannel | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const host = this.configService.get<string>('RABBITMQ_HOST');

    if (!host) {
      this.logger.warn('RABBITMQ_HOST not configured; async reports disabled');
      return;
    }

    try {
      const port = this.configService.get<number>('RABBITMQ_PORT', 5672);
      const user = this.configService.get<string>('RABBITMQ_USER', 'guest');
      const password = this.configService.get<string>('RABBITMQ_PASSWORD', 'guest');
      const url = 'amqp://' + user + ':' + password + '@' + host + ':' + String(port);

      this.connection = (await amqp.connect(url)) as unknown as AmqpConnection;
      this.channel = await this.connection.createChannel();
      await this.channel.assertQueue(this.queueName, { durable: true });
      this.logger.log('RabbitMQ report queue connected');
    } catch (error) {
      this.logger.error(
        'Failed to connect to RabbitMQ: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }

  publishReportJob(
    jobId: string,
    reportType: ReportType,
    filters: Record<string, unknown>,
    format: ReportFormat,
  ): void {
    if (!this.channel) {
      this.logger.warn('RabbitMQ channel not available; skipping publish for job ' + jobId);
      return;
    }

    const message: ReportJobMessage = { jobId, reportType, filters, format };
    const buffer = Buffer.from(JSON.stringify(message));

    this.channel.sendToQueue(this.queueName, buffer, { persistent: true });
    this.logger.log('Published report job ' + jobId);
  }

  async consume(handler: (message: ReportJobMessage) => Promise<void>): Promise<void> {
    if (!this.channel) {
      this.logger.warn('RabbitMQ channel not available; consumer not started');
      return;
    }

    const consumer = async (message: AmqpMessage | null): Promise<void> => {
      if (!message || !this.channel) {
        return;
      }

      try {
        const content = JSON.parse(message.content.toString()) as ReportJobMessage;
        await handler(content);
        this.channel.ack(message);
      } catch (error) {
        this.logger.error(
          'Error processing report job: ' +
            (error instanceof Error ? error.message : String(error)),
        );
        this.channel.nack(message, false, false);
      }
    };

    await this.channel.consume(this.queueName, (message) => {
      void consumer(message);
    });

    this.logger.log('Report job consumer started');
  }
}
