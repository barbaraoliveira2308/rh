import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './services/users.service';
import { Employee } from './entities/employee.entity';
import { Department } from './entities/department.entity';
import { JobTitle } from './entities/job-title.entity';
import { EmployeeRepository } from './entities/employee.repository';
import { DepartmentRepository } from './entities/department.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Employee, Department, JobTitle])],
  controllers: [UsersController],
  providers: [UsersService, EmployeeRepository, DepartmentRepository],
  exports: [UsersService, TypeOrmModule],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class UsersModule {}
