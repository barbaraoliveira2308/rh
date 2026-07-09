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
import { DataSubjectRequestType } from './data-subject-request-type.enum';
import { DataSubjectRequestStatus } from './data-subject-request-status.enum';

@Entity({ schema: 'hr', name: 'data_subject_requests' })
export class DataSubjectRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'subject_id', type: 'uuid', nullable: false })
  subjectId: string;

  @Column({ name: 'request_type', type: 'varchar', length: 50, nullable: false })
  requestType: DataSubjectRequestType;

  @Column({ type: 'varchar', length: 20, nullable: false })
  status: DataSubjectRequestStatus;

  @Column({ name: 'requested_at', type: 'timestamp', nullable: false })
  requestedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deadline: Date | null;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'response_notes', type: 'text', nullable: true })
  responseNotes: string | null;

  @Column({ name: 'response_payload', type: 'jsonb', nullable: true })
  responsePayload: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => Employee, { nullable: false })
  @JoinColumn({ name: 'subject_id' })
  subject: Employee;
}
