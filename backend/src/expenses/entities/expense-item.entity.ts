import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ExpenseReport } from './expense-report.entity';
import { ExpenseCategory } from './expense-category.entity';

const numericTransformer = {
  to: (value: number | null): number | null => value,
  from: (value: string | number | null): number | null => (value === null ? null : Number(value)),
};

@Entity({ schema: 'hr', name: 'expense_items' })
export class ExpenseItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'report_id', type: 'uuid', nullable: false })
  reportId: string;

  @Column({ name: 'category_id', type: 'uuid', nullable: false })
  categoryId: string;

  @Column({ type: 'varchar', length: 200, nullable: false })
  description: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
    transformer: numericTransformer,
  })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'EUR', nullable: false })
  currency: string;

  @Column({ name: 'expense_date', type: 'date', nullable: false })
  expenseDate: string;

  @Column({ name: 'receipt_url', type: 'varchar', length: 512, nullable: true })
  receiptUrl: string | null;

  @Column({ name: 'is_duplicate', type: 'boolean', default: false, nullable: false })
  isDuplicate: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => ExpenseReport, (report) => report.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'report_id' })
  report: ExpenseReport;

  @ManyToOne(() => ExpenseCategory, { nullable: false })
  @JoinColumn({ name: 'category_id' })
  category: ExpenseCategory;
}
