import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TimesheetPeriod } from './timesheet-period.entity';
import { Employee } from '../../users/entities/employee.entity';

@Entity({ schema: 'hr', name: 'timesheet_approvals' })
export class TimesheetApproval {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'timesheet_id', type: 'uuid', nullable: false })
  timesheetId: string;

  @Column({ name: 'approved_by', type: 'uuid', nullable: false })
  approvedBy: string;

  @Column({ name: 'approved_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  approvedAt: Date;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @ManyToOne(() => TimesheetPeriod, { nullable: false })
  @JoinColumn({ name: 'timesheet_id' })
  timesheet: TimesheetPeriod;

  @ManyToOne(() => Employee, { nullable: false })
  @JoinColumn({ name: 'approved_by' })
  approver: Employee;
}
