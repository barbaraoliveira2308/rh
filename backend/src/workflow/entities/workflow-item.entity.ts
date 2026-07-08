import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { WorkflowItemType } from './workflow-item-type.enum';
import { WorkflowItemStatus } from './workflow-item-status.enum';

@Entity({ schema: 'hr', name: 'workflow_items' })
@Index(['assigneeId', 'status'])
export class WorkflowItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: WorkflowItemType,
    nullable: false,
  })
  type: WorkflowItemType;

  @Column({ name: 'reference_id', type: 'uuid', nullable: false })
  referenceId: string;

  @Column({ name: 'reference_type', type: 'varchar', length: 50, nullable: false })
  referenceType: string;

  @Column({ name: 'requester_id', type: 'uuid', nullable: false })
  requesterId: string;

  @Column({ name: 'assignee_id', type: 'uuid', nullable: false })
  assigneeId: string;

  @Column({
    type: 'enum',
    enum: WorkflowItemStatus,
    default: WorkflowItemStatus.PENDING,
  })
  status: WorkflowItemStatus;

  @Column({ name: 'requested_at', type: 'timestamp', default: () => 'NOW()' })
  requestedAt: Date;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
