import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { UsersService } from './services/users.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeFilterDto } from './dto/employee-filter.dto';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { CreateJobTitleDto } from './dto/create-job-title.dto';
import { Department } from './entities/department.entity';
import { JobTitle } from './entities/job-title.entity';
import { Employee } from './entities/employee.entity';
import { OrgChartNode } from './dto/org-chart-node.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { Roles } from '../rbac/decorators/roles.decorator';
import { RoleEnum } from '../rbac/enums/role.enum';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller()
@ApiTags('Users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('users')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Listar colaboradores (paginado + filtros)' })
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query() filters: EmployeeFilterDto,
  ): Promise<{ data: Employee[]; total: number; page: number; limit: number }> {
    return this.usersService.findAll(filters);
  }

  @Get('users/:id')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Obter colaborador por ID' })
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<Employee> {
    return this.usersService.findOne(id);
  }

  @Post('users')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Criar colaborador (admin only)' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateEmployeeDto): Promise<Employee> {
    return this.usersService.create(dto);
  }

  @Patch('users/:id')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Atualizar colaborador' })
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @Req() req: Request,
  ): Promise<Employee> {
    const user = req.user as JwtPayload;
    const isAdmin = user.roles.includes(RoleEnum.ADMIN);
    const isManager = user.roles.includes(RoleEnum.MANAGER);

    if (!isAdmin && user.sub !== id && !isManager) {
      throw new ForbiddenException('Não tem permissão para editar este colaborador');
    }

    return this.usersService.update(id, dto);
  }

  @Delete('users/:id')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Desativar colaborador (soft delete)' })
  @HttpCode(HttpStatus.OK)
  async deactivate(@Param('id') id: string, @Body('endDate') endDate?: string): Promise<Employee> {
    return this.usersService.deactivate(id, endDate);
  }

  @Get('users/:id/org-chart')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Obter organograma' })
  @HttpCode(HttpStatus.OK)
  async getOrgChart(): Promise<OrgChartNode[]> {
    return this.usersService.getOrganizationChart();
  }

  @Get('departments')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Listar departamentos' })
  @HttpCode(HttpStatus.OK)
  async findAllDepartments(): Promise<Department[]> {
    return this.usersService.findAllDepartments();
  }

  @Post('departments')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Criar departamento (admin only)' })
  @HttpCode(HttpStatus.CREATED)
  async createDepartment(@Body() dto: CreateDepartmentDto): Promise<Department> {
    return this.usersService.createDepartment(dto);
  }

  @Patch('departments/:id')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Atualizar departamento (admin only)' })
  @HttpCode(HttpStatus.OK)
  async updateDepartment(
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
  ): Promise<Department> {
    return this.usersService.updateDepartment(id, dto);
  }

  @Get('job-titles')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Listar cargos' })
  @HttpCode(HttpStatus.OK)
  async findAllJobTitles(): Promise<JobTitle[]> {
    return this.usersService.findAllJobTitles();
  }

  @Post('job-titles')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Criar cargo (admin only)' })
  @HttpCode(HttpStatus.CREATED)
  async createJobTitle(@Body() dto: CreateJobTitleDto): Promise<JobTitle> {
    return this.usersService.createJobTitle(dto);
  }
}
