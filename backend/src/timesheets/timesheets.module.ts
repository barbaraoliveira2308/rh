import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimesheetsController } from './timesheets.controller';
import { TimesheetsService } from './services/timesheets.service';
import { TimesheetPeriod } from './entities/timesheet-period.entity';
import { TimesheetEntry } from './entities/timesheet-entry.entity';
import { TimesheetApproval } from './entities/timesheet-approval.entity';
import { Employee } from '../users/entities/employee.entity';
import { CalendarModule } from '../calendar/calendar.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TimesheetPeriod, TimesheetEntry, TimesheetApproval, Employee]),
    CalendarModule,
    AuditModule,
  ],
  controllers: [TimesheetsController],
  providers: [TimesheetsService],
  exports: [TimesheetsService, TypeOrmModule],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class TimesheetsModule {}
