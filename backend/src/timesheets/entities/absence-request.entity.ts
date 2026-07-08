import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export enum AbsenceStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity({ schema: 'hr', name: 'absence_requests' })
export class AbsenceRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'employee_id', type: 'uuid', nullable: false })
  employeeId: string;

  @Column({ name: 'start_date', type: 'date', nullable: false })
  startDate: string;

  @Column({ name: 'end_date', type: 'date', nullable: false })
  endDate: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  type: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: AbsenceStatus;

  @Column({ type: 'decimal', precision: 4, scale: 2, nullable: true })
  hours: number | null;
}
