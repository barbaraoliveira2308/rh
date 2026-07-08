import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ schema: 'hr', name: 'holiday_calendars' })
export class HolidayCalendar {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'country_code', type: 'varchar', length: 5, nullable: false })
  countryCode: string;

  @Column({ name: 'holiday_date', type: 'date', nullable: false })
  holidayDate: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  @Column({ name: 'is_mandatory', type: 'boolean', default: true })
  isMandatory: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  region: string | null;
}
