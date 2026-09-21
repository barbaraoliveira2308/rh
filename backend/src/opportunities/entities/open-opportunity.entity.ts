import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum OpportunityStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

@Entity({ schema: 'hr', name: 'open_opportunities' })
export class OpenOpportunity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  location: string | null;

  @Column({ type: 'varchar', length: 20, default: OpportunityStatus.OPEN })
  status: OpportunityStatus;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  skills: string[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
