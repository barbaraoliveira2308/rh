import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './services/analytics.service';
import { ProjectAllocation } from '../projects/entities/project-allocation.entity';
import { Project } from '../projects/entities/project.entity';
import { Employee } from '../users/entities/employee.entity';
import { TeamMember } from '../teams/entities/team-member.entity';
import { TimesheetEntry } from '../timesheets/entities/timesheet-entry.entity';
import { TimesheetPeriod } from '../timesheets/entities/timesheet-period.entity';
import { Contract } from '../contracts/entities/contract.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProjectAllocation,
      Project,
      Employee,
      TeamMember,
      TimesheetEntry,
      TimesheetPeriod,
      Contract,
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AnalyticsModule {}
