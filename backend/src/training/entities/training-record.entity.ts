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
import { Course } from './course.entity';

const numericTransformer = {
  to: (value: number | null): number | null => value,
  from: (value: string | number | null): number | null => (value === null ? null : Number(value)),
};

@Entity({ schema: 'hr', name: 'training_records' })
export class TrainingRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'employee_id', type: 'uuid', nullable: false })
  employeeId: string;

  @Column({ name: 'course_id', type: 'uuid', nullable: false })
  courseId: string;

  @Column({ name: 'enrollment_id', type: 'uuid', nullable: true })
  enrollmentId: string | null;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: false })
  completedAt: Date;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  score: number | null;

  @Column({ name: 'certificate_url', type: 'varchar', length: 512, nullable: true })
  certificateUrl: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => Employee, { nullable: false })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @ManyToOne(() => Course, { nullable: false })
  @JoinColumn({ name: 'course_id' })
  course: Course;
}
