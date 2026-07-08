import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './services/projects.service';
import { Project } from './entities/project.entity';
import { ProjectAllocation } from './entities/project-allocation.entity';
import { ProjectTeamAllocation } from './entities/project-team-allocation.entity';
import { Employee } from '../users/entities/employee.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, ProjectAllocation, ProjectTeamAllocation, Employee]),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService, TypeOrmModule],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ProjectsModule {}
