import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Employee } from '../../users/entities/employee.entity';
import { TimesheetEntry } from './timesheet-entry.entity';
import { TimesheetStatus } from './timesheet-status.enum';

@Entity({ schema: 'hr', name: 'timesheet_periods' })
export class TimesheetPeriod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'employee_id', type: 'uuid', nullable: false })
  employeeId: string;

  @Column({ name: 'period_year', type: 'int', nullable: false })
  periodYear: number;

  @Column({ name: 'period_month', type: 'int', nullable: false })
  periodMonth: number;

  @Column({ type: 'enum', enum: TimesheetStatus, default: TimesheetStatus.IN_PROGRESS })
  status: TimesheetStatus;

  @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
  submittedAt: Date | null;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string | null;

  @Column({ name: 'total_planned_hours', type: 'decimal', precision: 6, scale: 2, default: 0 })
  totalPlannedHours: number;

  @Column({ name: 'total_worked_hours', type: 'decimal', precision: 6, scale: 2, default: 0 })
  totalWorkedHours: number;

  @Column({ name: 'total_overtime_hours', type: 'decimal', precision: 6, scale: 2, default: 0 })
  totalOvertimeHours: number;

  @Column({ name: 'hours_balance', type: 'decimal', precision: 6, scale: 2, default: 0 })
  hoursBalance: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => Employee, { nullable: false })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @OneToMany(() => TimesheetEntry, (entry) => entry.timesheet)
  entries: TimesheetEntry[];
}
