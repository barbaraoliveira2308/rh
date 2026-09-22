import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Employee } from '../../users/entities/employee.entity';
import { AnnouncementForm } from './announcement-form.entity';

@Entity({ schema: 'hr', name: 'announcement_form_responses' })
export class AnnouncementFormResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'form_id', type: 'uuid' })
  formId: string;

  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId: string;

  @Column({ type: 'jsonb' })
  answers: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ManyToOne(() => AnnouncementForm, (form) => form.responses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'form_id' })
  form: AnnouncementForm;

  @ManyToOne(() => Employee, { nullable: false })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;
}
