import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ schema: 'hr', name: 'public_holidays' })
export class PublicHoliday {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'country_code', type: 'varchar', length: 5, nullable: false })
  countryCode: string;

  @Column({ name: 'holiday_date', type: 'date', nullable: false })
  holidayDate: string;

  @Column({ type: 'varchar', length: 200, nullable: false })
  name: string;

  @Column({ name: 'local_name', type: 'varchar', length: 200, nullable: true })
  localName: string | null;

  @Column({ type: 'boolean', default: false })
  global: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  region: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  type: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
