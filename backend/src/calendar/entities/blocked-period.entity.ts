import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum BlockedPeriodScope {
  ABSENCES = 'absences',
  TIMESHEETS = 'timesheets',
  ALL = 'all',
}

@Entity({ schema: 'hr', name: 'blocked_periods' })
export class BlockedPeriod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200, nullable: false })
  reason: string;

  @Column({ name: 'start_date', type: 'date', nullable: false })
  startDate: string;

  @Column({ name: 'end_date', type: 'date', nullable: false })
  endDate: string;

  @Column({ type: 'enum', enum: BlockedPeriodScope, default: BlockedPeriodScope.ALL })
  scope: BlockedPeriodScope;

  @Column({ name: 'created_by', type: 'uuid', nullable: false })
  createdBy: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
