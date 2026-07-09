import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrainingController } from './training.controller';
import { TrainingService } from './services/training.service';
import { Course } from './entities/course.entity';
import { CourseEnrollment } from './entities/course-enrollment.entity';
import { TrainingRecord } from './entities/training-record.entity';
import { PerformanceReview } from './entities/performance-review.entity';
import { Competency } from './entities/competency.entity';
import { EmployeeCompetency } from './entities/employee-competency.entity';
import { Employee } from '../users/entities/employee.entity';
import { TeamMember } from '../teams/entities/team-member.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Course,
      CourseEnrollment,
      TrainingRecord,
      PerformanceReview,
      Competency,
      EmployeeCompetency,
      Employee,
      TeamMember,
    ]),
  ],
  controllers: [TrainingController],
  providers: [TrainingService],
  exports: [TrainingService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class TrainingModule {}
