import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AbsencesController } from './absences.controller';
import { AbsencesService } from './services/absences.service';
import { AbsenceType } from './entities/absence-type.entity';
import { AbsenceRequest } from './entities/absence-request.entity';
import { AbsenceApproval } from './entities/absence-approval.entity';
import { LeaveBalance } from './entities/leave-balance.entity';
import { Employee } from '../users/entities/employee.entity';
import { HolidayCalendar } from '../timesheets/entities/holiday-calendar.entity';
import { CalendarModule } from '../calendar/calendar.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AbsenceType,
      AbsenceRequest,
      AbsenceApproval,
      LeaveBalance,
      Employee,
      HolidayCalendar,
    ]),
    CalendarModule,
  ],
  controllers: [AbsencesController],
  providers: [AbsencesService],
  exports: [AbsencesService, TypeOrmModule],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AbsencesModule {}
