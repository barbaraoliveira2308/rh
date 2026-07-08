import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ schema: 'hr', name: 'absence_types' })
export class AbsenceType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 20, unique: true, nullable: false })
  code: string;

  @Column({ type: 'enum', enum: ['days', 'hours'], default: 'days' })
  unit: 'days' | 'hours';

  @Column({ name: 'limit_per_year', type: 'decimal', precision: 6, scale: 2, nullable: true })
  limitPerYear: number | null;

  @Column({ name: 'requires_document', type: 'boolean', default: false })
  requiresDocument: boolean;

  @Column({ name: 'is_paid', type: 'boolean', default: true })
  isPaid: boolean;

  @Column({ name: 'affects_balance', type: 'boolean', default: true })
  affectsBalance: boolean;

  @Column({ type: 'varchar', length: 7, nullable: true })
  color: string | null;

  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'blocked_periods', type: 'text', nullable: true })
  blockedPeriods: string | null;
}
