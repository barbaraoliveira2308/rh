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
import { ReviewStatus } from './review-status.enum';

@Entity({ schema: 'hr', name: 'performance_reviews' })
export class PerformanceReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'employee_id', type: 'uuid', nullable: false })
  employeeId: string;

  @Column({ name: 'reviewer_id', type: 'uuid', nullable: false })
  reviewerId: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  period: string;

  @Column({ type: 'varchar', length: 20, default: ReviewStatus.DRAFT })
  status: ReviewStatus;

  @Column({ name: 'overall_rating', type: 'int', nullable: true })
  overallRating: number | null;

  @Column({ name: 'potential_rating', type: 'int', nullable: true })
  potentialRating: number | null;

  @Column({ type: 'text', nullable: true })
  strengths: string | null;

  @Column({ name: 'improvement_areas', type: 'text', nullable: true })
  improvementAreas: string | null;

  @Column({ name: 'objectives_next', type: 'text', nullable: true })
  objectivesNext: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => Employee, { nullable: false })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @ManyToOne(() => Employee, { nullable: false })
  @JoinColumn({ name: 'reviewer_id' })
  reviewer: Employee;
}
