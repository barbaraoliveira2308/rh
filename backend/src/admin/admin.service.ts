import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as client from 'prom-client';
import { SystemSetting } from './entities/system-setting.entity';
import { LegalEntity } from './entities/legal-entity.entity';
import { User } from '../auth/entities/user.entity';
import { Contract, ContractStatus } from '../contracts/entities/contract.entity';
import { UpdateSystemSettingsDto } from './dto/update-system-settings.dto';
import { CreateLegalEntityDto } from './dto/create-legal-entity.dto';
import { UpdateLegalEntityDto } from './dto/update-legal-entity.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { RbacService } from '../rbac/services/rbac.service';
import { RoleEnum } from '../rbac/enums/role.enum';

@Injectable()
export class AdminService {
  private readonly registry: client.Registry;

  constructor(
    @InjectRepository(SystemSetting)
    private readonly settingsRepository: Repository<SystemSetting>,
    @InjectRepository(LegalEntity)
    private readonly legalEntityRepository: Repository<LegalEntity>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
    private readonly rbacService: RbacService,
  ) {
    this.registry = new client.Registry();
    client.collectDefaultMetrics({ register: this.registry });
  }

  async getSettings(): Promise<SystemSetting> {
    const settings = await this.settingsRepository.find({ order: { updatedAt: 'ASC' }, take: 1 });
    if (settings.length === 0) {
      throw new NotFoundException('Configurações do sistema não inicializadas');
    }
    return settings[0];
  }

  async updateSettings(dto: UpdateSystemSettingsDto): Promise<SystemSetting> {
    const settings = await this.getSettings();
    Object.assign(settings, dto);
    return this.settingsRepository.save(settings);
  }

  async findLegalEntities(): Promise<LegalEntity[]> {
    return this.legalEntityRepository.find({ order: { name: 'ASC' } });
  }

  async createLegalEntity(dto: CreateLegalEntityDto): Promise<LegalEntity> {
    const entity = this.legalEntityRepository.create({
      name: dto.name,
      nif: dto.nif ?? null,
      country: dto.country,
      currency: dto.currency,
      calendarProfileCountryCode: dto.calendarProfileCountryCode,
      vacationDaysPerYearOverride: dto.vacationDaysPerYearOverride ?? null,
      isActive: dto.isActive ?? true,
    });
    return this.legalEntityRepository.save(entity);
  }

  async updateLegalEntity(id: string, dto: UpdateLegalEntityDto): Promise<LegalEntity> {
    const entity = await this.legalEntityRepository.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`Entidade legal ${id} não encontrada`);
    }
    Object.assign(entity, dto);
    return this.legalEntityRepository.save(entity);
  }

  async getEffectiveLegalEntity(employeeId: string): Promise<LegalEntity | null> {
    const contract = await this.contractRepository.findOne({
      where: { employeeId, status: ContractStatus.ACTIVE },
      relations: ['legalEntity'],
    });
    return contract?.legalEntity ?? null;
  }

  async createUser(dto: CreateUserDto, assignedBy: string): Promise<User> {
    const existingByEmail = await this.userRepository.findOneBy({ email: dto.email });
    if (existingByEmail) {
      throw new ConflictException('Já existe um utilizador com este email');
    }

    const username = dto.username ?? dto.email.split('@')[0];
    const existingByUsername = await this.userRepository.findOneBy({ username });
    if (existingByUsername) {
      throw new ConflictException('Nome de utilizador já existe');
    }

    const user = this.userRepository.create({
      email: dto.email,
      username,
      passwordHash: '',
      isActive: true,
    });
    const saved = await this.userRepository.save(user);

    await this.rbacService.assignRoleByName(saved.id, RoleEnum.EMPLOYEE, assignedBy);

    return saved;
  }

  health(): { status: string; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  async metrics(): Promise<string> {
    return this.registry.metrics();
  }

  metricsContentType(): string {
    return this.registry.contentType;
  }
}
