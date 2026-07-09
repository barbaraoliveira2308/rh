import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ReportType } from './report-type.enum';
import { ReportFrequency } from './report-frequency.enum';

@Entity({ schema: 'hr', name: 'scheduled_reports' })
export class ScheduledReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200, nullable: false })
  name: string;

  @Column({ name: 'report_type', type: 'varchar', length: 50, nullable: false })
  reportType: ReportType;

  @Column({ type: 'jsonb', nullable: false })
  filters: Record<string, unknown>;

  @Column({ type: 'varchar', length: 20, nullable: false })
  frequency: ReportFrequency;

  @Column({ name: 'recipients', type: 'text', array: true, default: '{}' })
  recipients: string[];

  @Column({ name: 'format', type: 'varchar', length: 10, nullable: false })
  format: string;

  @Column({ name: 'next_run_at', type: 'timestamp', nullable: true })
  nextRunAt: Date | null;

  @Column({ name: 'last_run_at', type: 'timestamp', nullable: true })
  lastRunAt: Date | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
