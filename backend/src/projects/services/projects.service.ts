import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThan } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Project, ProjectStatus } from '../entities/project.entity';
import { ProjectAllocation, AllocationType } from '../entities/project-allocation.entity';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { AllocateEmployeeDto } from '../dto/allocate-employee.dto';
import { UpdateAllocationDto } from '../dto/update-allocation.dto';
import { AllocationCreatedEvent } from '../events/allocation-created.event';
import { ProjectEndingAlertEvent } from '../events/project-ending-alert.event';
import { AllocationEndingAlertEvent } from '../events/allocation-ending-alert.event';
import { OverallocationDetectedEvent } from '../events/overallocation-detected.event';
import { Employee } from '../../users/entities/employee.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectAllocation)
    private readonly allocationRepository: Repository<ProjectAllocation>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateProjectDto): Promise<Project> {
    const project = this.projectRepository.create(
      Object.assign(Object.assign({}, dto), { status: ProjectStatus.DRAFT }),
    );
    return this.projectRepository.save(project);
  }

  async findAll(filters?: {
    status?: ProjectStatus;
    clientId?: string;
    managerId?: string;
  }): Promise<Project[]> {
    const where: Record<string, unknown> = {};

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.clientId) {
      where.clientId = filters.clientId;
    }
    if (filters?.managerId) {
      where.managerId = filters.managerId;
    }

    return this.projectRepository.find({
      where,
      relations: ['client', 'manager'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['client', 'manager', 'allocations', 'allocations.employee'],
    });
    if (!project) {
      throw new NotFoundException('Projeto não encontrado');
    }
    return project;
  }

  async update(id: string, dto: UpdateProjectDto): Promise<Project> {
    await this.findOne(id);
    await this.projectRepository.update(id, dto);
    return this.findOne(id);
  }

  async activate(projectId: string): Promise<Project> {
    const project = await this.findOne(projectId);

    if (project.status !== ProjectStatus.DRAFT) {
      throw new BadRequestException('Apenas projetos em estado draft podem ser ativados');
    }

    const allocationCount = await this.allocationRepository.count({
      where: { projectId },
    });

    if (allocationCount === 0) {
      throw new BadRequestException('Projeto precisa de pelo menos uma alocação antes de ativar');
    }

    project.status = ProjectStatus.ACTIVE;
    return this.projectRepository.save(project);
  }

  async close(projectId: string): Promise<Project> {
    const project = await this.findOne(projectId);

    if (project.status !== ProjectStatus.ACTIVE) {
      throw new BadRequestException('Apenas projetos ativos podem ser fechados');
    }

    project.endDate ??= new Date().toISOString().split('T')[0];

    await this.allocationRepository.update(
      { projectId, endDate: IsNull() },
      { endDate: new Date().toISOString().split('T')[0] },
    );

    project.status = ProjectStatus.CLOSED;
    return this.projectRepository.save(project);
  }

  async isProjectManager(projectId: string, userId: string): Promise<boolean> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      select: ['id', 'managerId'],
    });
    if (!project) return false;

    const employee = await this.employeeRepository.findOne({
      where: { userId },
      select: ['id'],
    });
    if (!employee) return false;

    return project.managerId === employee.id;
  }

  async allocateEmployee(
    projectId: string,
    dto: AllocateEmployeeDto,
  ): Promise<{ allocation: ProjectAllocation; warning?: string }> {
    const project = await this.findOne(projectId);

    if (project.status === ProjectStatus.CLOSED) {
      throw new BadRequestException('Não é possível alocar em projeto fechado');
    }

    if (project.status === ProjectStatus.DRAFT) {
      throw new BadRequestException('Não é possível alocar em projeto em rascunho');
    }

    const employee = await this.employeeRepository.findOne({
      where: { id: dto.employeeId },
    });
    if (!employee) {
      throw new NotFoundException('Colaborador não encontrado');
    }

    const overlapping = await this.allocationRepository.findOne({
      where: {
        employeeId: dto.employeeId,
        projectId,
        endDate: IsNull(),
      },
    });
    if (overlapping) {
      throw new ConflictException('Colaborador já tem alocação ativa neste projeto');
    }

    let warning: string | undefined;

    if (dto.allocationType === AllocationType.PERCENTAGE) {
      const activeAllocations = await this.allocationRepository.find({
        where: {
          employeeId: dto.employeeId,
          endDate: IsNull(),
        },
      });

      const currentTotal = activeAllocations.reduce((sum, a) => sum + a.allocationValue, 0);
      const newTotal = currentTotal + dto.allocationValue;

      if (newTotal > 100) {
        warning = `Sobrealocação detetada: total de ${String(newTotal)}% (máximo 100%)`;
        this.eventEmitter.emit(
          'allocation.overallocation-detected',
          new OverallocationDetectedEvent(dto.employeeId, projectId, newTotal),
        );
      }
    }

    const allocation = this.allocationRepository.create({
      projectId,
      employeeId: dto.employeeId,
      allocationType: dto.allocationType,
      allocationValue: dto.allocationValue,
      startDate: dto.startDate,
      endDate: dto.endDate ?? null,
      roleInProject: dto.roleInProject ?? null,
      hourlyRateOverride: dto.hourlyRateOverride ?? null,
      alertDaysBeforeEnd: dto.alertDaysBeforeEnd ?? 15,
      notes: dto.notes ?? null,
    });

    const saved = await this.allocationRepository.save(allocation);

    this.eventEmitter.emit(
      'allocation.created',
      new AllocationCreatedEvent(projectId, dto.employeeId, saved.id),
    );

    return { allocation: saved, warning };
  }

  async getActiveAllocations(projectId: string): Promise<ProjectAllocation[]> {
    await this.findOne(projectId);

    return this.allocationRepository.find({
      where: { projectId, endDate: IsNull() },
      relations: ['employee'],
      order: { createdAt: 'ASC' },
    });
  }

  async findAllocations(projectId: string): Promise<ProjectAllocation[]> {
    await this.findOne(projectId);

    return this.allocationRepository.find({
      where: { projectId },
      relations: ['employee'],
      order: { createdAt: 'ASC' },
    });
  }

  async updateAllocation(
    projectId: string,
    allocId: string,
    dto: UpdateAllocationDto,
  ): Promise<ProjectAllocation> {
    const allocation = await this.allocationRepository.findOne({
      where: { id: allocId, projectId },
    });
    if (!allocation) {
      throw new NotFoundException('Alocação não encontrada');
    }

    await this.allocationRepository.update(allocId, dto);
    const updated = await this.allocationRepository.findOne({
      where: { id: allocId },
      relations: ['employee'],
    });
    if (!updated) throw new NotFoundException('Alocação não encontrada');
    return updated;
  }

  async removeAllocation(projectId: string, allocId: string): Promise<void> {
    const allocation = await this.allocationRepository.findOne({
      where: { id: allocId, projectId },
    });
    if (!allocation) {
      throw new NotFoundException('Alocação não encontrada');
    }

    allocation.endDate = new Date().toISOString().split('T')[0];
    await this.allocationRepository.save(allocation);
  }

  @Cron('0 9 * * *')
  async checkEndingProjects(): Promise<void> {
    const projects = await this.projectRepository.find({
      where: { status: ProjectStatus.ACTIVE },
      relations: ['manager'],
    });

    for (const project of projects) {
      if (!project.endDate) continue;

      const endDate = new Date(project.endDate);
      const today = new Date();
      const diffTime = endDate.getTime() - today.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (daysRemaining <= project.alertDaysBeforeEnd && daysRemaining > 0) {
        this.eventEmitter.emit(
          'project.ending-alert',
          new ProjectEndingAlertEvent(project.id, project.name, project.endDate, daysRemaining),
        );
      }
    }

    const allocations = await this.allocationRepository.find({
      where: { endDate: MoreThan(new Date().toISOString().split('T')[0]) },
      relations: ['project'],
    });

    for (const allocation of allocations) {
      if (!allocation.endDate) continue;

      const endDate = new Date(allocation.endDate);
      const today = new Date();
      const diffTime = endDate.getTime() - today.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (daysRemaining <= allocation.alertDaysBeforeEnd && daysRemaining > 0) {
        this.eventEmitter.emit(
          'allocation.ending-alert',
          new AllocationEndingAlertEvent(
            allocation.projectId,
            allocation.id,
            allocation.employeeId,
            allocation.endDate,
            daysRemaining,
          ),
        );
      }
    }
  }

  async isAllocationOwner(projectId: string, allocId: string, userId: string): Promise<boolean> {
    const allocation = await this.allocationRepository.findOne({
      where: { id: allocId, projectId },
      relations: ['employee'],
    });
    if (!allocation) return false;

    const employee = await this.employeeRepository.findOne({
      where: { userId },
      select: ['id'],
    });
    if (!employee) return false;

    return allocation.employeeId === employee.id;
  }
}
