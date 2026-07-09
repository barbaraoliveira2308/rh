import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ReportType } from './report-type.enum';
import { ReportJobStatus } from './report-job-status.enum';

@Entity({ schema: 'hr', name: 'report_jobs' })
export class ReportJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'scheduled_report_id', type: 'uuid', nullable: true })
  scheduledReportId: string | null;

  @Column({ name: 'report_type', type: 'varchar', length: 50, nullable: false })
  reportType: ReportType;

  @Column({ type: 'jsonb', nullable: false })
  filters: Record<string, unknown>;

  @Column({ type: 'varchar', length: 10, nullable: false })
  format: string;

  @Column({ type: 'varchar', length: 20, nullable: false })
  status: ReportJobStatus;

  @Column({ name: 'result_url', type: 'varchar', length: 512, nullable: true })
  resultUrl: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'row_count', type: 'int', nullable: true })
  rowCount: number | null;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
