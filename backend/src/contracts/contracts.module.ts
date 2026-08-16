import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './services/contracts.service';
import { Contract } from './entities/contract.entity';
import { ContractRenewal } from './entities/contract-renewal.entity';
import { Employee } from '../users/entities/employee.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Contract, ContractRenewal, Employee]), AuditModule],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService, TypeOrmModule],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ContractsModule {}
