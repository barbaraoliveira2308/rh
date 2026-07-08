import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ schema: 'hr', name: 'notification_preferences' })
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'employee_id', type: 'uuid', nullable: false })
  employeeId: string;

  @Column({ name: 'notification_type', type: 'varchar', length: 100, nullable: false })
  notificationType: string;

  @Column({ name: 'email_enabled', type: 'boolean', default: true, nullable: false })
  emailEnabled: boolean;

  @Column({ name: 'in_app_enabled', type: 'boolean', default: true, nullable: false })
  inAppEnabled: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
