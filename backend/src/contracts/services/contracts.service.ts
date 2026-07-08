import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Contract, ContractStatus } from '../entities/contract.entity';
import { ContractRenewal } from '../entities/contract-renewal.entity';
import { CreateContractDto } from '../dto/create-contract.dto';
import { UpdateContractDto } from '../dto/update-contract.dto';
import { RenewContractDto } from '../dto/renew-contract.dto';
import { ContractExpiringSoonEvent } from '../events/contract-expiring-soon.event';
import { Employee } from '../../users/entities/employee.entity';

@Injectable()
export class ContractsService {
  constructor(
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
    @InjectRepository(ContractRenewal)
    private readonly renewalRepository: Repository<ContractRenewal>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateContractDto): Promise<Contract> {
    const employee = await this.employeeRepository.findOne({
      where: { id: dto.employeeId },
    });
    if (!employee) {
      throw new NotFoundException('Colaborador não encontrado');
    }

    const activeContract = await this.contractRepository.findOne({
      where: {
        employeeId: dto.employeeId,
        status: ContractStatus.ACTIVE,
      },
    });
    if (activeContract) {
      throw new ConflictException('Colaborador já tem um contrato ativo');
    }

    const contract = this.contractRepository.create(dto as Partial<Contract>);
    return this.contractRepository.save(contract);
  }

  async findAll(filters?: { status?: ContractStatus; employeeId?: string }): Promise<Contract[]> {
    const where: Record<string, unknown> = {};

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.employeeId) {
      where.employeeId = filters.employeeId;
    }

    return this.contractRepository.find({
      where,
      relations: ['employee'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Contract> {
    const contract = await this.contractRepository.findOne({
      where: { id },
      relations: ['employee', 'renewals'],
    });
    if (!contract) {
      throw new NotFoundException('Contrato não encontrado');
    }
    return contract;
  }

  async update(id: string, dto: UpdateContractDto): Promise<Contract> {
    await this.findOne(id);
    await this.contractRepository.update(id, dto);
    return this.findOne(id);
  }

  async renew(id: string, dto: RenewContractDto): Promise<Contract> {
    const contract = await this.findOne(id);

    if (contract.status !== ContractStatus.ACTIVE) {
      throw new BadRequestException('Apenas contratos ativos podem ser renovados');
    }

    const renewal = this.renewalRepository.create({
      contractId: id,
      renewedAt: new Date(),
      previousEndDate: contract.endDate,
      newEndDate: dto.newEndDate,
    });
    await this.renewalRepository.save(renewal);

    contract.endDate = dto.newEndDate;
    return this.contractRepository.save(contract);
  }

  async findExpiringSoon(days = 30): Promise<Contract[]> {
    const target = new Date();
    target.setDate(target.getDate() + days);
    const targetDate = target.toISOString().split('T')[0];

    return this.contractRepository.find({
      where: {
        status: ContractStatus.ACTIVE,
        endDate: LessThan(targetDate),
      },
      relations: ['employee'],
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async scheduleExpirationAlerts(): Promise<void> {
    const soonContracts = await this.findExpiringSoon(30);

    for (const contract of soonContracts) {
      if (!contract.endDate) continue;

      const endDate = new Date(contract.endDate);
      const today = new Date();
      const diffTime = endDate.getTime() - today.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      this.eventEmitter.emit(
        'contract.expiring-soon',
        new ContractExpiringSoonEvent(
          contract.id,
          contract.employeeId,
          contract.endDate,
          daysRemaining,
        ),
      );
    }

    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - 1);
    const expiredDateStr = expiredDate.toISOString().split('T')[0];

    const expiredContracts = await this.contractRepository.find({
      where: {
        status: ContractStatus.ACTIVE,
        endDate: LessThan(expiredDateStr),
      },
    });

    for (const contract of expiredContracts) {
      contract.status = ContractStatus.EXPIRED;
      await this.contractRepository.save(contract);
    }
  }

  async getDocumentPresignedUrl(id: string): Promise<string> {
    const contract = await this.findOne(id);
    if (!contract.documentUrl) {
      throw new NotFoundException('Contrato não tem documento associado');
    }
    return contract.documentUrl;
  }
}
