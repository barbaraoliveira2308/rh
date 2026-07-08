import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimesheetsController } from './timesheets.controller';
import { TimesheetsService } from './services/timesheets.service';
import { TimesheetPeriod } from './entities/timesheet-period.entity';
import { TimesheetEntry } from './entities/timesheet-entry.entity';
import { TimesheetApproval } from './entities/timesheet-approval.entity';
import { HolidayCalendar } from './entities/holiday-calendar.entity';
import { AbsenceRequest } from './entities/absence-request.entity';
import { Employee } from '../users/entities/employee.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TimesheetPeriod,
      TimesheetEntry,
      TimesheetApproval,
      HolidayCalendar,
      AbsenceRequest,
      Employee,
    ]),
  ],
  controllers: [TimesheetsController],
  providers: [TimesheetsService],
  exports: [TimesheetsService, TypeOrmModule],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class TimesheetsModule {}
