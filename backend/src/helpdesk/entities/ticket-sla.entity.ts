import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Ticket } from './ticket.entity';
import { TicketPriority } from './ticket-priority.enum';

@Entity({ schema: 'hr', name: 'ticket_slas' })
export class TicketSla {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ticket_id', type: 'uuid', nullable: false })
  ticketId: string;

  @Column({ type: 'varchar', length: 20, nullable: false })
  priority: TicketPriority;

  @Column({ type: 'timestamp', nullable: false })
  deadline: Date;

  @Column({ type: 'boolean', default: false })
  breached: boolean;

  @Column({ name: 'notified_at', type: 'timestamp', nullable: true })
  notifiedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ManyToOne(() => Ticket, { nullable: false })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;
}
