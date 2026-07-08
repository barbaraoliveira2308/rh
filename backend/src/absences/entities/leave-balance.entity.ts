import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Employee } from '../../users/entities/employee.entity';
import { AbsenceType } from './absence-type.entity';

const numericTransformer = {
  to: (value: number | null): number | null => value,
  from: (value: string | number | null): number | null => (value === null ? null : Number(value)),
};

@Entity({ schema: 'hr', name: 'leave_balances' })
@Unique(['employeeId', 'absenceTypeId', 'year'])
export class LeaveBalance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'employee_id', type: 'uuid', nullable: false })
  employeeId: string;

  @Column({ name: 'absence_type_id', type: 'uuid', nullable: false })
  absenceTypeId: string;

  @Column({ type: 'int', nullable: false })
  year: number;

  @Column({
    name: 'entitled_days',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  entitledDays: number;

  @Column({
    name: 'used_days',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  usedDays: number;

  @Column({
    name: 'pending_days',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  pendingDays: number;

  @Column({
    name: 'remaining_days',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  remainingDays: number;

  @Column({
    name: 'carry_over_days',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  carryOverDays: number;

  @ManyToOne(() => Employee, { nullable: false })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @ManyToOne(() => AbsenceType, { nullable: false })
  @JoinColumn({ name: 'absence_type_id' })
  absenceType: AbsenceType;
}
