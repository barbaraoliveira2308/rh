import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Course } from './course.entity';
import { Employee } from '../../users/entities/employee.entity';
import { EnrollmentStatus } from './enrollment-status.enum';

const numericTransformer = {
  to: (value: number | null): number | null => value,
  from: (value: string | number | null): number | null => (value === null ? null : Number(value)),
};

@Entity({ schema: 'hr', name: 'course_enrollments' })
export class CourseEnrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'course_id', type: 'uuid', nullable: false })
  courseId: string;

  @Column({ name: 'employee_id', type: 'uuid', nullable: false })
  employeeId: string;

  @Column({ type: 'varchar', length: 20, default: EnrollmentStatus.ENROLLED })
  status: EnrollmentStatus;

  @Column({ name: 'completion_date', type: 'date', nullable: true })
  completionDate: string | null;

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

  @ManyToOne(() => Course, { nullable: false })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @ManyToOne(() => Employee, { nullable: false })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;
}
