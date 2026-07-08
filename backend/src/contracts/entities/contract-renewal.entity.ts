import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Contract } from './contract.entity';

@Entity({ schema: 'hr', name: 'contract_renewals' })
export class ContractRenewal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contract_id', type: 'uuid', nullable: false })
  contractId: string;

  @Column({ name: 'renewed_at', type: 'timestamp', nullable: false })
  renewedAt: Date;

  @Column({ name: 'previous_end_date', type: 'date', nullable: true })
  previousEndDate: string | null;

  @Column({ name: 'new_end_date', type: 'date', nullable: false })
  newEndDate: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @ManyToOne(() => Contract, (contract) => contract.renewals, { nullable: false })
  @JoinColumn({ name: 'contract_id' })
  contract: Contract;
}
