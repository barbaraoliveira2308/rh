import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CapacityController } from './capacity.controller';
import { CapacityService } from './capacity.service';
import { Employee } from '../users/entities/employee.entity';
import { ProjectAllocation } from '../projects/entities/project-allocation.entity';
import { AbsenceRequest } from '../absences/entities/absence-request.entity';
import { AnalyticsModule } from '../analytics/analytics.module';
import { TeamsModule } from '../teams/teams.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Employee, ProjectAllocation, AbsenceRequest]),
    AnalyticsModule,
    TeamsModule,
  ],
  controllers: [CapacityController],
  providers: [CapacityService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class CapacityModule {}
