import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Employee } from '../../users/entities/employee.entity';
import { ContractRenewal } from './contract-renewal.entity';

export enum ContractType {
  PERMANENT = 'permanent',
  FIXED_TERM = 'fixed_term',
  FREELANCER = 'freelancer',
  B2B = 'b2b',
}

export enum ContractStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  TERMINATED = 'terminated',
}

@Entity({ schema: 'hr', name: 'contracts' })
export class Contract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'employee_id', type: 'uuid', nullable: false })
  employeeId: string;

  @Column({ name: 'contract_type', type: 'varchar', length: 20, nullable: false })
  contractType: ContractType;

  @Column({ type: 'varchar', length: 20, default: ContractStatus.DRAFT })
  status: ContractStatus;

  @Column({ name: 'start_date', type: 'date', nullable: false })
  startDate: string;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  value: number | null;

  @Column({ name: 'monthly_cost', type: 'decimal', precision: 12, scale: 2, nullable: true })
  monthlyCost: number | null;

  @Column({ type: 'varchar', length: 3, default: 'EUR' })
  currency: string;

  @Column({ name: 'contracting_entity', type: 'varchar', length: 200, nullable: false })
  contractingEntity: string;

  @Column({ name: 'renewal_alert_days', type: 'int', default: 30 })
  renewalAlertDays: number;

  @Column({ name: 'document_url', type: 'varchar', length: 512, nullable: true })
  documentUrl: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'terminated_at', type: 'timestamp', nullable: true })
  terminatedAt: Date | null;

  @Column({ name: 'termination_reason', type: 'text', nullable: true })
  terminationReason: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @ManyToOne(() => Employee, { nullable: false })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @OneToMany(() => ContractRenewal, (renewal) => renewal.contract)
  renewals: ContractRenewal[];
}
