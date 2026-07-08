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

export enum ClientStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity({ schema: 'hr', name: 'clients' })
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 20, unique: true, nullable: true })
  nif: string | null;

  @Column({ name: 'contact_name', type: 'varchar', length: 100, nullable: true })
  contactName: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ name: 'responsible_id', type: 'uuid', nullable: true })
  responsibleId: string | null;

  @Column({ type: 'varchar', length: 20, default: ClientStatus.ACTIVE })
  status: ClientStatus;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'responsible_id' })
  responsible: Employee | null;
}
