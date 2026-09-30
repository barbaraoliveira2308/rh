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
  UseInterceptors,
  Req,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { EmployeeProfile, UsersService } from './services/users.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { EmployeeFilterDto } from './dto/employee-filter.dto';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { CreateJobTitleDto } from './dto/create-job-title.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { Department } from './entities/department.entity';
import { JobTitle } from './entities/job-title.entity';
import { Employee } from './entities/employee.entity';
import { OrgChartNode } from './dto/org-chart-node.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { Roles } from '../rbac/decorators/roles.decorator';
import { RoleEnum } from '../rbac/enums/role.enum';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { EmployeeIdentityService } from '../auth/services/employee-identity.service';
import { Audit } from '../audit/decorators';
import { AuditInterceptor } from '../audit/interceptors/audit.interceptor';
import { RbacService } from '../rbac/services/rbac.service';

@Controller()
@ApiTags('Users')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@ApiBearerAuth()
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly employeeIdentity: EmployeeIdentityService,
    private readonly rbacService: RbacService,
  ) {}

  @Get('users')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Listar colaboradores (paginado + filtros)' })
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query() filters: EmployeeFilterDto,
  ): Promise<{ data: Employee[]; total: number; page: number; limit: number }> {
    return this.usersService.findAll(filters);
  }

  @Get('users/me')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Obter o perfil do colaborador autenticado' })
  @HttpCode(HttpStatus.OK)
  async findMyProfile(@Req() req: Request): Promise<EmployeeProfile> {
    const user = req.user as JwtPayload;
    return this.usersService.findByUserId(user.sub);
  }

  @Patch('users/me')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @Audit('Updated', 'Employee')
  @ApiOperation({ summary: 'Atualizar o perfil do colaborador autenticado' })
  @HttpCode(HttpStatus.OK)
  async updateMyProfile(
    @Body() dto: UpdateMyProfileDto,
    @Req() req: Request,
  ): Promise<EmployeeProfile> {
    const user = req.user as JwtPayload;
    const canEditEmployment =
      user.roles.includes(RoleEnum.ADMIN) || user.roles.includes(RoleEnum.MANAGER);
    return this.usersService.updateMyProfile(user.sub, dto, canEditEmployment);
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
  @Audit('Created', 'Employee')
  @ApiOperation({ summary: 'Criar colaborador (admin only)' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateEmployeeDto): Promise<Employee> {
    return this.usersService.create(dto);
  }

  @Patch('users/:id')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.EMPLOYEE)
  @Audit('Updated', 'Employee')
  @ApiOperation({ summary: 'Atualizar colaborador' })
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @Req() req: Request,
  ): Promise<Employee> {
    const user = req.user as JwtPayload;
    const isAdmin = user.roles.includes(RoleEnum.ADMIN);

    if (!isAdmin) {
      const callerEmployeeId = await this.employeeIdentity.resolveEmployeeId(user.sub);
      const isSelf = callerEmployeeId === id;
      const isManager = user.roles.includes(RoleEnum.MANAGER);
      const isManagerOfTarget =
        !isSelf && isManager && (await this.usersService.isManagerOfEmployee(callerEmployeeId, id));

      if (!isSelf && !isManagerOfTarget) {
        throw new ForbiddenException('Não tem permissão para editar este colaborador');
      }
    }

    return this.usersService.update(id, dto);
  }

  @Delete('users/:id')
  @Roles(RoleEnum.ADMIN)
  @Audit('Deactivated', 'Employee')
  @ApiOperation({ summary: 'Desativar colaborador (soft delete)' })
  @HttpCode(HttpStatus.OK)
  async deactivate(@Param('id') id: string, @Body('endDate') endDate?: string): Promise<Employee> {
    return this.usersService.deactivate(id, endDate);
  }

  @Post('users/:employeeId/roles')
  @Roles(RoleEnum.ADMIN)
  @Audit('PermissionChanged', 'User')
  @ApiOperation({ summary: 'Atribuir perfil de acesso a um colaborador (admin only)' })
  @HttpCode(HttpStatus.CREATED)
  async assignRole(
    @Param('employeeId') employeeId: string,
    @Body() dto: AssignRoleDto,
    @Req() req: Request,
  ): Promise<{ id: string; employeeId: string; role: RoleEnum }> {
    const employee = await this.usersService.findOne(employeeId);
    const user = req.user as JwtPayload;
    await this.rbacService.assignRoleByName(employee.userId, dto.role, user.sub);
    return { id: employee.userId, employeeId, role: dto.role };
  }

  @Delete('users/:employeeId/roles/:role')
  @Roles(RoleEnum.ADMIN)
  @Audit('RoleChanged', 'User')
  @ApiOperation({ summary: 'Revogar perfil de acesso de um colaborador (admin only)' })
  @HttpCode(HttpStatus.OK)
  async revokeRole(
    @Param('employeeId') employeeId: string,
    @Param('role') role: string,
  ): Promise<{ id: string; employeeId: string; role: string }> {
    const employee = await this.usersService.findOne(employeeId);
    await this.rbacService.revokeRoleByName(employee.userId, role);
    return { id: employee.userId, employeeId, role };
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
