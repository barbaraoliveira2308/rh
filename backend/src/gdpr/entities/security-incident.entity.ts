import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SecurityIncidentSeverity } from './security-incident-severity.enum';
import { SecurityIncidentStatus } from './security-incident-status.enum';

@Entity({ schema: 'hr', name: 'security_incidents' })
export class SecurityIncident {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200, nullable: false })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 20, nullable: false })
  severity: SecurityIncidentSeverity;

  @Column({ name: 'detected_at', type: 'timestamp', nullable: false })
  detectedAt: Date;

  @Column({ name: 'reported_to_authority_at', type: 'timestamp', nullable: true })
  reportedToAuthorityAt: Date | null;

  @Column({ name: 'affected_subjects', type: 'int', nullable: true })
  affectedSubjects: number | null;

  @Column({ type: 'varchar', length: 20, nullable: false })
  status: SecurityIncidentStatus;

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes: string | null;

  @Column({ name: 'reported_by', type: 'uuid', nullable: true })
  reportedBy: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
