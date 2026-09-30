import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee, EmployeeStatus } from '../entities/employee.entity';
import { Department } from '../entities/department.entity';
import { JobTitle } from '../entities/job-title.entity';
import { EmployeeRepository } from '../entities/employee.repository';
import { DepartmentRepository, DepartmentTreeNode } from '../entities/department.repository';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { EmployeeFilterDto } from '../dto/employee-filter.dto';
import { CreateDepartmentDto } from '../dto/create-department.dto';
import { UpdateDepartmentDto } from '../dto/update-department.dto';
import { CreateJobTitleDto } from '../dto/create-job-title.dto';
import { UpdateJobTitleDto } from '../dto/update-job-title.dto';
import { OrgChartNode } from '../dto/org-chart-node.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly employeeRepository: EmployeeRepository,
    private readonly departmentRepository: DepartmentRepository,
    @InjectRepository(Department)
    private readonly departmentBaseRepository: Repository<Department>,
    @InjectRepository(JobTitle)
    private readonly jobTitleRepository: Repository<JobTitle>,
  ) {}

  async create(dto: CreateEmployeeDto): Promise<Employee> {
    const existingByEmail = await this.employeeRepository.findOne({
      where: { email: dto.email },
    });
    if (existingByEmail) {
      throw new ConflictException('Email já registado');
    }

    if (dto.employeeNumber) {
      const existingByNumber = await this.employeeRepository.findOne({
        where: { employeeNumber: dto.employeeNumber },
      });
      if (existingByNumber) {
        throw new ConflictException('Número de colaborador já existe');
      }
    }

    if (dto.nif) {
      const existingByNif = await this.employeeRepository.findOne({
        where: { nif: dto.nif },
      });
      if (existingByNif) {
        throw new ConflictException('NIF já registado');
      }
    }

    if (dto.managerId && dto.managerId === dto.userId) {
      throw new BadRequestException('Um colaborador não pode ser seu próprio gestor');
    }

    const employee = this.employeeRepository.create(dto as Partial<Employee>);
    return this.employeeRepository.save(employee);
  }

  async findAll(filters: EmployeeFilterDto): Promise<{
    data: Employee[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.departmentId) {
      where.departmentId = filters.departmentId;
    }

    let queryBuilder = this.employeeRepository
      .createQueryBuilder('employee')
      .leftJoinAndSelect('employee.department', 'department')
      .leftJoinAndSelect('employee.jobTitle', 'jobTitle')
      .leftJoinAndSelect('employee.manager', 'manager')
      .skip(skip)
      .take(limit)
      .orderBy('employee.createdAt', 'DESC');

    if (filters.status) {
      queryBuilder = queryBuilder.andWhere('employee.status = :status', { status: filters.status });
    }

    if (filters.departmentId) {
      queryBuilder = queryBuilder.andWhere('employee.departmentId = :departmentId', {
        departmentId: filters.departmentId,
      });
    }

    if (filters.search) {
      queryBuilder = queryBuilder.andWhere(
        '(employee.firstName ILIKE :search OR employee.lastName ILIKE :search OR employee.email ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({
      where: { id },
      relations: ['department', 'jobTitle', 'manager', 'user'],
    });

    if (!employee) {
      throw new NotFoundException('Colaborador não encontrado');
    }

    return employee;
  }

  async update(id: string, dto: UpdateEmployeeDto): Promise<Employee> {
    const employee = await this.findOne(id);

    if (dto.email && dto.email !== employee.email) {
      const existing = await this.employeeRepository.findOne({
        where: { email: dto.email },
      });
      if (existing) {
        throw new ConflictException('Email já registado');
      }
    }

    if (dto.employeeNumber && dto.employeeNumber !== employee.employeeNumber) {
      const existing = await this.employeeRepository.findOne({
        where: { employeeNumber: dto.employeeNumber },
      });
      if (existing) {
        throw new ConflictException('Número de colaborador já existe');
      }
    }

    if (dto.managerId === id) {
      throw new BadRequestException('Um colaborador não pode ser seu próprio gestor');
    }

    if (dto.managerId) {
      const hasCircular = await this.wouldCreateCircularHierarchy(id, dto.managerId);
      if (hasCircular) {
        throw new BadRequestException('Hierarquia circular não permitida');
      }
    }

    await this.employeeRepository.update(id, dto);
    return this.findOne(id);
  }

  async deactivate(id: string, endDate?: string): Promise<Employee> {
    const employee = await this.findOne(id);

    if (employee.status === EmployeeStatus.INACTIVE) {
      throw new BadRequestException('Colaborador já está inativo');
    }

    await this.employeeRepository.update(id, {
      status: EmployeeStatus.INACTIVE,
      employmentEndDate: endDate ?? null,
    });

    return this.findOne(id);
  }

  async getOrganizationChart(): Promise<OrgChartNode[]> {
    const allEmployees = await this.employeeRepository.find({
      where: { status: EmployeeStatus.ACTIVE },
      relations: ['department', 'jobTitle', 'manager'],
    });

    const employeeMap = new Map<string, OrgChartNode>();
    for (const emp of allEmployees) {
      employeeMap.set(emp.id, {
        id: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        employeeNumber: emp.employeeNumber,
        jobTitle: emp.jobTitle?.name ?? null,
        department: emp.department?.name ?? null,
        status: emp.status,
        photoUrl: emp.photoUrl,
        children: [],
      });
    }

    const roots: OrgChartNode[] = [];
    for (const emp of allEmployees) {
      const node = employeeMap.get(emp.id);
      if (!node) continue;

      if (emp.managerId) {
        const parent = employeeMap.get(emp.managerId);
        if (parent) {
          parent.children.push(node);
          continue;
        }
      }
      roots.push(node);
    }

    return roots;
  }

  async transferEmployee(
    employeeId: string,
    newDepartmentId: string | null,
    newManagerId: string | null,
  ): Promise<Employee> {
    await this.findOne(employeeId);

    if (newManagerId === employeeId) {
      throw new BadRequestException('Um colaborador não pode ser seu próprio gestor');
    }

    if (newManagerId) {
      const hasCircular = await this.wouldCreateCircularHierarchy(employeeId, newManagerId);
      if (hasCircular) {
        throw new BadRequestException('Hierarquia circular não permitida');
      }
    }

    await this.employeeRepository.update(employeeId, {
      departmentId: newDepartmentId,
      managerId: newManagerId,
    });

    return this.findOne(employeeId);
  }

  async createDepartment(dto: CreateDepartmentDto): Promise<Department> {
    const existing = await this.departmentBaseRepository.findOne({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException('Departamento já existe');
    }

    const department = this.departmentBaseRepository.create(dto as Partial<Department>);
    return this.departmentBaseRepository.save(department);
  }

  async updateDepartment(id: string, dto: UpdateDepartmentDto): Promise<Department> {
    const department = await this.departmentBaseRepository.findOneBy({ id });
    if (!department) {
      throw new NotFoundException('Departamento não encontrado');
    }

    if (dto.name) {
      const existing = await this.departmentBaseRepository.findOne({
        where: { name: dto.name },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('Departamento já existe');
      }
    }

    if (dto.parentId === id) {
      throw new BadRequestException('Um departamento não pode ser seu próprio pai');
    }

    await this.departmentBaseRepository.update(id, dto);
    const updated = await this.departmentBaseRepository.findOneBy({ id });
    if (!updated) throw new NotFoundException('Departamento não encontrado');
    return updated;
  }

  async findAllDepartments(): Promise<Department[]> {
    return this.departmentBaseRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findDepartmentTree(): Promise<DepartmentTreeNode[]> {
    return this.departmentRepository.findTree();
  }

  async createJobTitle(dto: CreateJobTitleDto): Promise<JobTitle> {
    const existing = await this.jobTitleRepository.findOne({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException('Cargo já existe');
    }

    const jobTitle = this.jobTitleRepository.create(dto as Partial<JobTitle>);
    return this.jobTitleRepository.save(jobTitle);
  }

  async updateJobTitle(id: string, dto: UpdateJobTitleDto): Promise<JobTitle> {
    const jobTitle = await this.jobTitleRepository.findOneBy({ id });
    if (!jobTitle) {
      throw new NotFoundException('Cargo não encontrado');
    }

    if (dto.name) {
      const existing = await this.jobTitleRepository.findOne({
        where: { name: dto.name },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('Cargo já existe');
      }
    }

    await this.jobTitleRepository.update(id, dto);
    const updated = await this.jobTitleRepository.findOneBy({ id });
    if (!updated) throw new NotFoundException('Cargo não encontrado');
    return updated;
  }

  async findAllJobTitles(): Promise<JobTitle[]> {
    return this.jobTitleRepository.find({
      order: { name: 'ASC' },
    });
  }

  async isManagerOfEmployee(potentialManagerId: string, employeeId: string): Promise<boolean> {
    const visited = new Set<string>();
    let currentId: string | null = employeeId;

    while (currentId) {
      if (visited.has(currentId)) {
        return false;
      }
      visited.add(currentId);

      const current = await this.employeeRepository.findOne({
        where: { id: currentId },
        select: ['id', 'managerId'],
      });

      if (!current?.managerId) {
        return false;
      }

      if (current.managerId === potentialManagerId) {
        return true;
      }

      currentId = current.managerId;
    }

    return false;
  }

  private async wouldCreateCircularHierarchy(
    employeeId: string,
    potentialManagerId: string,
  ): Promise<boolean> {
    if (employeeId === potentialManagerId) {
      return true;
    }

    const visited = new Set<string>();
    const queue: string[] = [potentialManagerId];

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!currentId) break;

      if (currentId === employeeId) {
        return true;
      }

      if (visited.has(currentId)) {
        continue;
      }

      visited.add(currentId);

      const current = await this.employeeRepository.findOne({
        where: { id: currentId },
        select: ['id', 'managerId'],
      });

      if (current?.managerId) {
        queue.push(current.managerId);
      }
    }

    return false;
  }
}
