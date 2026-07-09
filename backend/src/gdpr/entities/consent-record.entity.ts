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
import { LegalBasis } from './legal-basis.enum';

@Entity({ schema: 'hr', name: 'consent_records' })
export class ConsentRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'subject_id', type: 'uuid', nullable: false })
  subjectId: string;

  @Column({ type: 'varchar', length: 200, nullable: false })
  purpose: string;

  @Column({ name: 'legal_basis', type: 'varchar', length: 50, nullable: false })
  legalBasis: LegalBasis;

  @Column({ name: 'version', type: 'varchar', length: 20, nullable: true })
  version: string | null;

  @Column({ name: 'granted_at', type: 'timestamp', nullable: true })
  grantedAt: Date | null;

  @Column({ name: 'revoked_at', type: 'timestamp', nullable: true })
  revokedAt: Date | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'collected_by', type: 'varchar', length: 100, nullable: true })
  collectedBy: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => Employee, { nullable: false })
  @JoinColumn({ name: 'subject_id' })
  subject: Employee;
}
