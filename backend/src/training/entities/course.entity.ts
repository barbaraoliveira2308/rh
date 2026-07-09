import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CourseStatus } from './course-status.enum';

const numericTransformer = {
  to: (value: number | null): number | null => value,
  from: (value: string | number | null): number | null => (value === null ? null : Number(value)),
};

@Entity({ schema: 'hr', name: 'courses' })
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  provider: string | null;

  @Column({
    name: 'duration_hours',
    type: 'decimal',
    precision: 5,
    scale: 1,
    nullable: true,
    transformer: numericTransformer,
  })
  durationHours: number | null;

  @Column({ name: 'is_mandatory', type: 'boolean', default: false })
  isMandatory: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string | null;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: string | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: string | null;

  @Column({ type: 'varchar', length: 20, default: CourseStatus.PLANNED })
  status: CourseStatus;

  @Column({ name: 'prerequisite_course_id', type: 'uuid', nullable: true })
  prerequisiteCourseId: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
