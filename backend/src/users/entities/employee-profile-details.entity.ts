import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Employee } from './employee.entity';
import { GdprSensitive } from '../decorators';

const percentageTransformer = {
  to: (value: number | null): number | null => value,
  from: (value: string | number | null): number | null => (value === null ? null : Number(value)),
};

@Entity({ schema: 'hr', name: 'employee_profile_details' })
export class EmployeeProfileDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'employee_id', type: 'uuid', unique: true, nullable: false })
  employeeId: string;

  @Column({ name: 'preferred_name', type: 'varchar', length: 100, nullable: true })
  preferredName: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  pronouns: string | null;

  @Column({ name: 'hide_birthday', type: 'boolean', default: false })
  hideBirthday: boolean;

  @Column({ name: 'id_document_type', type: 'varchar', length: 60, nullable: true })
  idDocumentType: string | null;

  @GdprSensitive
  @Column({ name: 'id_document_number', type: 'varchar', length: 100, nullable: true })
  idDocumentNumber: string | null;

  @GdprSensitive
  @Column({ name: 'id_document_expiry', type: 'date', nullable: true })
  idDocumentExpiry: string | null;

  @GdprSensitive
  @Column({ name: 'social_security_number', type: 'varchar', length: 30, nullable: true })
  socialSecurityNumber: string | null;

  @Column({ name: 'retirement_regime', type: 'varchar', length: 100, nullable: true })
  retirementRegime: string | null;

  @GdprSensitive
  @Column({ name: 'address_line_2', type: 'varchar', length: 200, nullable: true })
  addressLine2: string | null;

  @GdprSensitive
  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @GdprSensitive
  @Column({ name: 'postal_code', type: 'varchar', length: 20, nullable: true })
  postalCode: string | null;

  @GdprSensitive
  @Column({ type: 'varchar', length: 100, nullable: true })
  province: string | null;

  @GdprSensitive
  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string | null;

  @GdprSensitive
  @Column({
    name: 'disability_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    transformer: percentageTransformer,
  })
  disabilityPercentage: number | null;

  @GdprSensitive
  @Column({ name: 'emergency_contact_name', type: 'varchar', length: 150, nullable: true })
  emergencyContactName: string | null;

  @GdprSensitive
  @Column({ name: 'emergency_contact_phone', type: 'varchar', length: 30, nullable: true })
  emergencyContactPhone: string | null;

  @Column({ name: 'bank_account_format', type: 'varchar', length: 20, nullable: true })
  bankAccountFormat: string | null;

  @GdprSensitive
  @Column({ name: 'swift_bic', type: 'varchar', length: 11, nullable: true })
  swiftBic: string | null;

  @Column({
    name: 'irs_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    transformer: percentageTransformer,
  })
  irsPercentage: number | null;

  @Column({ name: 'absence_approver_id', type: 'uuid', nullable: true })
  absenceApproverId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @OneToOne(() => Employee)
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'absence_approver_id' })
  absenceApprover: Employee | null;
}
