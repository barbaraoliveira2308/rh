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
import { AbsenceType } from './absence-type.entity';
import { AbsenceStatus } from './absence-status.enum';

@Entity({ schema: 'hr', name: 'absence_requests' })
export class AbsenceRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'employee_id', type: 'uuid', nullable: false })
  employeeId: string;

  @Column({ name: 'absence_type_id', type: 'uuid', nullable: false })
  absenceTypeId: string;

  @Column({ name: 'start_date', type: 'date', nullable: false })
  startDate: string;

  @Column({ name: 'end_date', type: 'date', nullable: false })
  endDate: string;

  @Column({ name: 'start_half', type: 'boolean', default: false })
  startHalf: boolean;

  @Column({ name: 'end_half', type: 'boolean', default: false })
  endHalf: boolean;

  @Column({ name: 'total_days', type: 'decimal', precision: 5, scale: 2, default: 0 })
  totalDays: number;

  @Column({ name: 'total_hours', type: 'decimal', precision: 6, scale: 2, default: 0 })
  totalHours: number;

  @Column({ type: 'enum', enum: AbsenceStatus, default: AbsenceStatus.PENDING })
  status: AbsenceStatus;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'document_url', type: 'varchar', length: 512, nullable: true })
  documentUrl: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => Employee, { nullable: false })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @ManyToOne(() => AbsenceType, { nullable: false })
  @JoinColumn({ name: 'absence_type_id' })
  absenceType: AbsenceType;
}
