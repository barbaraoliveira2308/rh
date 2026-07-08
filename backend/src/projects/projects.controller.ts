import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { ProjectsService } from './services/projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AllocateEmployeeDto } from './dto/allocate-employee.dto';
import { UpdateAllocationDto } from './dto/update-allocation.dto';
import { Project, ProjectStatus } from './entities/project.entity';
import { ProjectAllocation } from './entities/project-allocation.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { Roles } from '../rbac/decorators/roles.decorator';
import { RoleEnum } from '../rbac/enums/role.enum';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller()
@ApiTags('Projects')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get('projects')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Listar projetos (com filtros)' })
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('status') status?: ProjectStatus,
    @Query('client_id') clientId?: string,
    @Query('manager_id') managerId?: string,
  ): Promise<Project[]> {
    return this.projectsService.findAll({ status, clientId, managerId });
  }

  @Get('projects/:id')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Obter projeto por ID' })
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<Project> {
    return this.projectsService.findOne(id);
  }

  @Post('projects')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Criar projeto' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateProjectDto): Promise<Project> {
    return this.projectsService.create(dto);
  }

  @Patch('projects/:id')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Atualizar projeto (admin ou manager do projeto)' })
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @Req() req: Request,
  ): Promise<Project> {
    const user = req.user as JwtPayload;
    const isAdmin = user.roles.includes(RoleEnum.ADMIN);

    if (!isAdmin) {
      const isManager = await this.projectsService.isProjectManager(id, user.sub);
      if (!isManager) {
        throw new ForbiddenException('Apenas admin ou manager do projeto pode atualizar');
      }
    }

    return this.projectsService.update(id, dto);
  }

  @Post('projects/:id/activate')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Ativar projeto (draft -> active)' })
  @HttpCode(HttpStatus.OK)
  async activate(@Param('id') id: string): Promise<Project> {
    return this.projectsService.activate(id);
  }

  @Post('projects/:id/close')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Fechar projeto (active -> closed)' })
  @HttpCode(HttpStatus.OK)
  async close(@Param('id') id: string): Promise<Project> {
    return this.projectsService.close(id);
  }

  @Get('projects/:id/allocations')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Listar alocações do projeto' })
  @HttpCode(HttpStatus.OK)
  async getAllocations(@Param('id') id: string): Promise<ProjectAllocation[]> {
    return this.projectsService.findAllocations(id);
  }

  @Post('projects/:id/allocations')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Alocar colaborador ao projeto' })
  @HttpCode(HttpStatus.CREATED)
  async allocateEmployee(
    @Param('id') id: string,
    @Body() dto: AllocateEmployeeDto,
  ): Promise<{ allocation: ProjectAllocation; warning?: string }> {
    return this.projectsService.allocateEmployee(id, dto);
  }

  @Patch('projects/:id/allocations/:allocId')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Atualizar alocação' })
  @HttpCode(HttpStatus.OK)
  async updateAllocation(
    @Param('id') id: string,
    @Param('allocId') allocId: string,
    @Body() dto: UpdateAllocationDto,
  ): Promise<ProjectAllocation> {
    return this.projectsService.updateAllocation(id, allocId, dto);
  }

  @Delete('projects/:id/allocations/:allocId')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Remover alocação (soft delete)' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAllocation(
    @Param('id') id: string,
    @Param('allocId') allocId: string,
  ): Promise<void> {
    return this.projectsService.removeAllocation(id, allocId);
  }
}
