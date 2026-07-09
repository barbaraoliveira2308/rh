import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Employee } from '../../users/entities/employee.entity';
import { Competency } from './competency.entity';

@Entity({ schema: 'hr', name: 'employee_competencies' })
export class EmployeeCompetency {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'employee_id', type: 'uuid', nullable: false })
  employeeId: string;

  @Column({ name: 'competency_id', type: 'uuid', nullable: false })
  competencyId: string;

  @Column({ type: 'int', nullable: false })
  level: number;

  @Column({ name: 'assessed_at', type: 'date', nullable: false })
  assessedAt: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => Employee, { nullable: false })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @ManyToOne(() => Competency, { nullable: false })
  @JoinColumn({ name: 'competency_id' })
  competency: Competency;
}
