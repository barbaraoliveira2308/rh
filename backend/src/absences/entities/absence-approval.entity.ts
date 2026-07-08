import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AbsenceRequest } from './absence-request.entity';
import { Employee } from '../../users/entities/employee.entity';

@Entity({ schema: 'hr', name: 'absence_approvals' })
export class AbsenceApproval {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'absence_id', type: 'uuid', nullable: false })
  absenceId: string;

  @Column({ name: 'approver_id', type: 'uuid', nullable: false })
  approverId: string;

  @Column({ name: 'decision', type: 'varchar', length: 20, nullable: false })
  decision: 'approved' | 'rejected';

  @Column({ name: 'decided_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  decidedAt: Date;

  @Column({ type: 'text', nullable: true })
  comments: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @ManyToOne(() => AbsenceRequest, { nullable: false })
  @JoinColumn({ name: 'absence_id' })
  absence: AbsenceRequest;

  @ManyToOne(() => Employee, { nullable: false })
  @JoinColumn({ name: 'approver_id' })
  approver: Employee;
}
