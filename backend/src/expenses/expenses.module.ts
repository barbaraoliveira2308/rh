import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './services/expenses.service';
import { ExpenseCategory } from './entities/expense-category.entity';
import { ExpenseReport } from './entities/expense-report.entity';
import { ExpenseItem } from './entities/expense-item.entity';
import { ExpenseApproval } from './entities/expense-approval.entity';
import { Employee } from '../users/entities/employee.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExpenseCategory,
      ExpenseReport,
      ExpenseItem,
      ExpenseApproval,
      Employee,
    ]),
  ],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService, TypeOrmModule],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ExpensesModule {}
