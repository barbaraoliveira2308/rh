import { Controller, Get, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { Roles } from '../rbac/decorators/roles.decorator';
import { RoleEnum } from '../rbac/enums/role.enum';
import { CapacityService } from './capacity.service';

function currentMonth(): string {
  const now = new Date();
  return String(now.getFullYear()) + '-' + String(now.getMonth() + 1).padStart(2, '0');
}

@Controller('capacity')
@ApiTags('Capacity')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
export class CapacityController {
  constructor(private readonly capacityService: CapacityService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Taxa de ocupação por colaborador/equipa (RF-CAP-001)' })
  @ApiQuery({ name: 'period', required: false, description: 'YYYY-MM, omitido = mês atual' })
  @ApiQuery({ name: 'teamId', required: false })
  @ApiQuery({ name: 'employeeId', required: false })
  @HttpCode(HttpStatus.OK)
  async getOverview(
    @Query('period') period?: string,
    @Query('teamId') teamId?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.capacityService.getOverview(period ?? currentMonth(), teamId, employeeId);
  }

  @Get('calendar')
  @ApiOperation({
    summary: 'Estrutura de dados para calendário de ocupação tipo Gantt (RF-CAP-004)',
  })
  @ApiQuery({ name: 'period', required: false, description: 'YYYY-MM, omitido = mês atual' })
  @ApiQuery({ name: 'teamId', required: false })
  @ApiQuery({ name: 'employeeId', required: false })
  @HttpCode(HttpStatus.OK)
  async getCalendar(
    @Query('period') period?: string,
    @Query('teamId') teamId?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.capacityService.getCalendar(period ?? currentMonth(), teamId, employeeId);
  }

  @Get('alerts')
  @ApiOperation({
    summary: 'Alertas de sobrealocação, sub-alocação e recursos disponíveis (RF-CAP-002/003)',
  })
  @ApiQuery({ name: 'period', required: false, description: 'YYYY-MM, omitido = mês atual' })
  @ApiQuery({ name: 'teamId', required: false })
  @HttpCode(HttpStatus.OK)
  async getAlerts(@Query('period') period?: string, @Query('teamId') teamId?: string) {
    return this.capacityService.getAlerts(period ?? currentMonth(), teamId);
  }

  @Get('project-profitability/:projectId')
  @ApiOperation({ summary: 'Rentabilidade de um projeto (RF-CAP-006)' })
  @HttpCode(HttpStatus.OK)
  async getProjectProfitability(@Param('projectId') projectId: string) {
    return this.capacityService.getProjectProfitability(projectId);
  }
}
