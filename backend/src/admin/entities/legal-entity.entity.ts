import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ schema: 'hr', name: 'legal_entities' })
export class LegalEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 30, unique: true, nullable: true })
  nif: string | null;

  @Column({ type: 'varchar', length: 5, nullable: false })
  country: string;

  @Column({ type: 'varchar', length: 5, nullable: false })
  currency: string;

  @Column({ name: 'calendar_profile_country_code', type: 'varchar', length: 5, nullable: false })
  calendarProfileCountryCode: string;

  @Column({ name: 'vacation_days_per_year_override', type: 'int', nullable: true })
  vacationDaysPerYearOverride: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
