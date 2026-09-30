import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './services/users.service';
import { Employee } from './entities/employee.entity';
import { Department } from './entities/department.entity';
import { JobTitle } from './entities/job-title.entity';
import { EmployeeProfileDetails } from './entities/employee-profile-details.entity';
import { EmployeeRepository } from './entities/employee.repository';
import { DepartmentRepository } from './entities/department.repository';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Employee, Department, JobTitle, EmployeeProfileDetails]),
    AuditModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, EmployeeRepository, DepartmentRepository],
  exports: [UsersService, TypeOrmModule],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class UsersModule {}
