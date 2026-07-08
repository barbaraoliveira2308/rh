import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ExpenseReport } from './expense-report.entity';
import { Employee } from '../../users/entities/employee.entity';

@Entity({ schema: 'hr', name: 'expense_approvals' })
export class ExpenseApproval {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'report_id', type: 'uuid', nullable: false })
  reportId: string;

  @Column({ name: 'approver_id', type: 'uuid', nullable: false })
  approverId: string;

  @Column({ type: 'varchar', length: 20, nullable: false })
  decision: 'approved' | 'rejected';

  @Column({ name: 'decided_at', type: 'timestamp', default: () => 'NOW()' })
  decidedAt: Date;

  @Column({ type: 'text', nullable: true })
  comments: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @ManyToOne(() => ExpenseReport, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'report_id' })
  report: ExpenseReport;

  @ManyToOne(() => Employee, { nullable: false })
  @JoinColumn({ name: 'approver_id' })
  approver: Employee;
}
