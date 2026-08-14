import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

const numericTransformer = {
  to: (value: number | null): number | null => value,
  from: (value: string | number | null): number | null => (value === null ? null : Number(value)),
};

@Entity({ schema: 'hr', name: 'system_settings' })
export class SystemSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_name', type: 'varchar', length: 200, default: 'Bridge351' })
  companyName: string;

  @Column({ name: 'default_country', type: 'varchar', length: 5, default: 'PT' })
  defaultCountry: string;

  @Column({ name: 'default_currency', type: 'varchar', length: 5, default: 'EUR' })
  defaultCurrency: string;

  @Column({ name: 'default_vacation_days_per_year', type: 'int', default: 22 })
  defaultVacationDaysPerYear: number;

  @Column({ name: 'carry_over_vacation_days', type: 'int', default: 5 })
  carryOverVacationDays: number;

  @Column({ name: 'timesheet_submission_deadline_day', type: 'int', default: 5 })
  timesheetSubmissionDeadlineDay: number;

  @Column({
    name: 'default_daily_hours',
    type: 'decimal',
    precision: 4,
    scale: 2,
    default: 8.0,
    transformer: numericTransformer,
  })
  defaultDailyHours: number;

  @Column({ name: 'contract_expiry_alert_days', type: 'int', default: 30 })
  contractExpiryAlertDays: number;

  @Column({ name: 'project_end_alert_days', type: 'int', default: 30 })
  projectEndAlertDays: number;

  @Column({
    name: 'underallocation_threshold_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 80.0,
    transformer: numericTransformer,
  })
  underallocationThresholdPercentage: number;

  @Column({ name: 'session_timeout_minutes', type: 'int', default: 30 })
  sessionTimeoutMinutes: number;

  @Column({ name: 'max_login_attempts', type: 'int', default: 5 })
  maxLoginAttempts: number;

  @Column({ name: 'lockout_period_minutes', type: 'int', default: 15 })
  lockoutPeriodMinutes: number;

  @Column({ name: 'mfa_required_for_admin', type: 'boolean', default: true })
  mfaRequiredForAdmin: boolean;

  @Column({ name: 'gdpr_post_exit_retention_years', type: 'int', default: 5 })
  gdprPostExitRetentionYears: number;

  @Column({ name: 'documents_trash_retention_days', type: 'int', default: 30 })
  documentsTrashRetentionDays: number;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
