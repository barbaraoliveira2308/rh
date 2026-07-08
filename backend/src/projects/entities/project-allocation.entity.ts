import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from './project.entity';
import { Employee } from '../../users/entities/employee.entity';

export enum AllocationType {
  PERCENTAGE = 'percentage',
  HOURS = 'hours',
}

@Entity({ schema: 'hr', name: 'project_allocations' })
export class ProjectAllocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id', type: 'uuid', nullable: false })
  projectId: string;

  @Column({ name: 'employee_id', type: 'uuid', nullable: false })
  employeeId: string;

  @Column({ name: 'allocation_type', type: 'varchar', length: 20, nullable: false })
  allocationType: AllocationType;

  @Column({ name: 'allocation_value', type: 'decimal', precision: 5, scale: 2, nullable: false })
  allocationValue: number;

  @Column({ name: 'start_date', type: 'date', nullable: false })
  startDate: string;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: string | null;

  @Column({ name: 'role_in_project', type: 'varchar', length: 100, nullable: true })
  roleInProject: string | null;

  @Column({
    name: 'hourly_rate_override',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  hourlyRateOverride: number | null;

  @Column({ name: 'alert_days_before_end', type: 'int', default: 15 })
  alertDaysBeforeEnd: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @ManyToOne(() => Project, (project) => project.allocations, { nullable: false })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => Employee, { nullable: false })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;
}
