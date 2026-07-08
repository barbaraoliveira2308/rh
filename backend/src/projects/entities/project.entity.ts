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
import { Client } from '../../clients/entities/client.entity';
import { Employee } from '../../users/entities/employee.entity';
import { ProjectAllocation } from './project-allocation.entity';
import { ProjectTeamAllocation } from './project-team-allocation.entity';

export enum ProjectStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  CLOSED = 'closed',
}

@Entity({ schema: 'hr', name: 'projects' })
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 50, unique: true, nullable: true })
  code: string | null;

  @Column({ name: 'client_id', type: 'uuid', nullable: false })
  clientId: string;

  @Column({ name: 'manager_id', type: 'uuid', nullable: false })
  managerId: string;

  @Column({ type: 'varchar', length: 20, default: ProjectStatus.DRAFT })
  status: ProjectStatus;

  @Column({ name: 'start_date', type: 'date', nullable: false })
  startDate: string;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'hourly_rate', type: 'decimal', precision: 10, scale: 2, nullable: true })
  hourlyRate: number | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  budget: number | null;

  @Column({ name: 'alert_days_before_end', type: 'int', default: 30 })
  alertDaysBeforeEnd: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => Client, { nullable: false })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @ManyToOne(() => Employee, { nullable: false })
  @JoinColumn({ name: 'manager_id' })
  manager: Employee;

  @OneToMany(() => ProjectAllocation, (alloc) => alloc.project)
  allocations: ProjectAllocation[];

  @OneToMany(() => ProjectTeamAllocation, (alloc) => alloc.project)
  teamAllocations: ProjectTeamAllocation[];
}
