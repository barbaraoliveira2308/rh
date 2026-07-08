import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TimesheetPeriod } from './timesheet-period.entity';
import { EntryType } from './entry-type.enum';

@Entity({ schema: 'hr', name: 'timesheet_entries' })
export class TimesheetEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'timesheet_id', type: 'uuid', nullable: false })
  timesheetId: string;

  @Column({ name: 'entry_date', type: 'date', nullable: false })
  entryDate: string;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId: string | null;

  @Column({ name: 'absence_id', type: 'uuid', nullable: true })
  absenceId: string | null;

  @Column({ name: 'planned_hours', type: 'decimal', precision: 4, scale: 2, default: 8 })
  plannedHours: number;

  @Column({ name: 'worked_hours', type: 'decimal', precision: 4, scale: 2, default: 0 })
  workedHours: number;

  @Column({ name: 'overtime_hours', type: 'decimal', precision: 4, scale: 2, default: 0 })
  overtimeHours: number;

  @Column({ type: 'enum', enum: EntryType, default: EntryType.WORK })
  entryType: EntryType;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'is_locked', type: 'boolean', default: false })
  isLocked: boolean;

  @ManyToOne(() => TimesheetPeriod, (period) => period.entries, { nullable: false })
  @JoinColumn({ name: 'timesheet_id' })
  timesheet: TimesheetPeriod;
}
