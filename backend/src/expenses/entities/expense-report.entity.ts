import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Employee } from '../../users/entities/employee.entity';
import { ExpenseReportStatus } from './expense-report-status.enum';
import { ExpenseItem } from './expense-item.entity';

const numericTransformer = {
  to: (value: number | null): number | null => value,
  from: (value: string | number | null): number | null => (value === null ? null : Number(value)),
};

@Entity({ schema: 'hr', name: 'expense_reports' })
export class ExpenseReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'employee_id', type: 'uuid', nullable: false })
  employeeId: string;

  @Column({ type: 'varchar', length: 200, nullable: false })
  title: string;

  @Column({ name: 'period_start', type: 'date', nullable: false })
  periodStart: string;

  @Column({ name: 'period_end', type: 'date', nullable: false })
  periodEnd: string;

  @Column({
    type: 'enum',
    enum: ExpenseReportStatus,
    default: ExpenseReportStatus.DRAFT,
  })
  status: ExpenseReportStatus;

  @Column({
    name: 'total_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  totalAmount: number;

  @Column({ type: 'varchar', length: 3, default: 'EUR', nullable: false })
  currency: string;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
  submittedAt: Date | null;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => Employee, { nullable: false })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @OneToMany(() => ExpenseItem, (item) => item.report, { cascade: true })
  items: ExpenseItem[];
}
