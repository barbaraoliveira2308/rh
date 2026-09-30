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
import { TeamsService } from './services/teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AddTeamMemberDto } from './dto/add-team-member.dto';
import { Team } from './entities/team.entity';
import { TeamMember } from './entities/team-member.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { Roles } from '../rbac/decorators/roles.decorator';
import { RoleEnum } from '../rbac/enums/role.enum';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller()
@ApiTags('Teams')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get('teams')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Listar equipas' })
  @HttpCode(HttpStatus.OK)
  async findAll(): Promise<Team[]> {
    return this.teamsService.findAll();
  }

  @Get('teams/me')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Listar equipas do colaborador autenticado' })
  @HttpCode(HttpStatus.OK)
  async findMine(@Req() req: Request): Promise<TeamMember[]> {
    const user = req.user as JwtPayload;
    return this.teamsService.findForUser(user.sub);
  }

  @Get('teams/:id')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Obter equipa por ID' })
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<Team> {
    return this.teamsService.findOne(id);
  }

  @Post('teams')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Criar equipa' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateTeamDto): Promise<Team> {
    return this.teamsService.create(dto);
  }

  @Patch('teams/:id')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Atualizar equipa (admin ou manager da equipa)' })
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTeamDto,
    @Req() req: Request,
  ): Promise<Team> {
    const user = req.user as JwtPayload;
    const isAdmin = user.roles.includes(RoleEnum.ADMIN);

    if (!isAdmin) {
      const isTeamLeader = await this.teamsService.isTeamLeader(id, user.sub);
      if (!isTeamLeader) {
        throw new ForbiddenException('Apenas admin ou manager da equipa pode atualizar');
      }
    }

    return this.teamsService.update(id, dto);
  }

  @Get('teams/:id/members')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Listar membros da equipa' })
  @HttpCode(HttpStatus.OK)
  async getMembers(@Param('id') id: string): Promise<TeamMember[]> {
    return this.teamsService.getMembers(id);
  }

  @Post('teams/:id/members')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Adicionar membro à equipa' })
  @HttpCode(HttpStatus.CREATED)
  async addMember(
    @Param('id') id: string,
    @Body() dto: AddTeamMemberDto,
    @Req() req: Request,
  ): Promise<TeamMember> {
    const user = req.user as JwtPayload;
    const isAdmin = user.roles.includes(RoleEnum.ADMIN);

    if (!isAdmin) {
      const isTeamLeader = await this.teamsService.isTeamLeader(id, user.sub);
      if (!isTeamLeader) {
        throw new ForbiddenException('Apenas admin ou manager da equipa pode adicionar membros');
      }
    }

    return this.teamsService.addMember(id, dto);
  }

  @Delete('teams/:id/members/:employeeId')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Remover membro da equipa (soft delete)' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Param('id') id: string,
    @Param('employeeId') employeeId: string,
    @Req() req: Request,
  ): Promise<void> {
    const user = req.user as JwtPayload;
    const isAdmin = user.roles.includes(RoleEnum.ADMIN);

    if (!isAdmin) {
      const isTeamLeader = await this.teamsService.isTeamLeader(id, user.sub);
      if (!isTeamLeader) {
        throw new ForbiddenException('Apenas admin ou manager da equipa pode remover membros');
      }
    }

    return this.teamsService.removeMember(id, employeeId);
  }

  @Get('teams/:id/capacity')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Calcular capacidade da equipa num mês' })
  @HttpCode(HttpStatus.OK)
  async getTeamCapacity(
    @Param('id') id: string,
    @Query('month') month: string,
  ): Promise<{ teamId: string; month: string; capacity: number }> {
    const capacity = await this.teamsService.getTeamCapacity(id, month);
    return { teamId: id, month, capacity };
  }
}
