import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TicketPriority } from './ticket-priority.enum';

@Entity({ schema: 'hr', name: 'ticket_categories' })
export class TicketCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  @Column({
    name: 'default_priority',
    type: 'varchar',
    length: 20,
    nullable: false,
    default: TicketPriority.MEDIUM,
  })
  defaultPriority: TicketPriority;

  @Column({ name: 'sla_hours', type: 'int', nullable: false })
  slaHours: number;

  @Column({ name: 'resolution_team_id', type: 'uuid', nullable: true })
  resolutionTeamId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
