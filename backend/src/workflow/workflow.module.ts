import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './services/workflow.service';
import { WorkflowItem } from './entities/workflow-item.entity';
import { Employee } from '../users/entities/employee.entity';
import { TimesheetPeriod } from '../timesheets/entities/timesheet-period.entity';
import { AbsenceRequest } from '../absences/entities/absence-request.entity';
import { ExpenseReport } from '../expenses/entities/expense-report.entity';
import { TimesheetsModule } from '../timesheets/timesheets.module';
import { AbsencesModule } from '../absences/absences.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { CalendarModule } from '../calendar/calendar.module';
import { EmployeeProfileDetails } from '../users/entities/employee-profile-details.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkflowItem,
      Employee,
      TimesheetPeriod,
      AbsenceRequest,
      EmployeeProfileDetails,
      ExpenseReport,
    ]),
    TimesheetsModule,
    AbsencesModule,
    ExpensesModule,
    CalendarModule,
  ],
  controllers: [WorkflowController],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class WorkflowModule {}
