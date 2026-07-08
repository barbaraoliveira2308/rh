import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarService } from './services/calendar.service';
import { CalendarController } from './calendar.controller';
import { PublicHoliday } from './entities/public-holiday.entity';
import { CompanyEvent } from './entities/company-event.entity';
import { BlockedPeriod } from './entities/blocked-period.entity';
import { Employee } from '../users/entities/employee.entity';
import { AbsenceRequest } from '../absences/entities/absence-request.entity';
import { TeamMember } from '../teams/entities/team-member.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PublicHoliday,
      CompanyEvent,
      BlockedPeriod,
      Employee,
      AbsenceRequest,
      TeamMember,
    ]),
  ],
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class CalendarModule {}
