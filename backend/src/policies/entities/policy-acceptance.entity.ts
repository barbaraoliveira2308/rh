import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Policy } from './policy.entity';

@Entity({ schema: 'hr', name: 'policy_acceptances' })
@Index('uq_policy_acceptance_user_policy', ['userId', 'policyId'], { unique: true })
export class PolicyAcceptance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'policy_id', type: 'uuid' })
  policyId: string;

  @ManyToOne(() => Policy, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'policy_id' })
  policy: Policy;

  @Column({ name: 'policy_version', type: 'int' })
  policyVersion: number;

  @CreateDateColumn({ name: 'accepted_at', type: 'timestamp' })
  acceptedAt: Date;
}
