import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RetentionAction } from './retention-action.enum';

@Entity({ schema: 'hr', name: 'retention_policies' })
export class RetentionPolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'data_category', type: 'varchar', length: 100, nullable: false })
  dataCategory: string;

  @Column({ name: 'retention_years', type: 'int', nullable: false })
  retentionYears: number;

  @Column({ name: 'legal_reference', type: 'text', nullable: true })
  legalReference: string | null;

  @Column({ name: 'action_after_retention', type: 'varchar', length: 20, nullable: false })
  actionAfterRetention: RetentionAction;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
