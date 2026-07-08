import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { AnalyticsService } from './services/analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { Roles } from '../rbac/decorators/roles.decorator';
import { RoleEnum } from '../rbac/enums/role.enum';

function formatCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) {
    return '';
  }

  const headers = Object.keys(rows[0]);
  const headerLine = headers.join(',');
  const lines = rows.map((row) =>
    headers
      .map((header) => {
        const text = formatCsvValue(row[header]);
        return '"' + text.replace(/"/g, '""') + '"';
      })
      .join(','),
  );

  return [headerLine, ...lines].join('\n');
}

function sendResponse(res: Response, data: unknown, filename: string, format?: string): void {
  if (format === 'csv') {
    const rows = Array.isArray(data) ? data : [data];
    const csv = toCsv(rows as Record<string, unknown>[]);

    res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '.csv"');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.send(csv);
    return;
  }

  res.json(data);
}

@Controller()
@ApiTags('Analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('analytics/resources/occupancy')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Ocupação por colaborador de uma equipa' })
  @HttpCode(HttpStatus.OK)
  async getTeamOccupancy(
    @Query('teamId') teamId: string,
    @Query('month') month: string,
    @Query('format') format: string,
    @Res() res: Response,
  ): Promise<void> {
    const data = await this.analyticsService.getTeamOccupancy(teamId, month);
    sendResponse(res, data, 'team-occupancy-' + month, format);
  }

  @Get('analytics/resources/unallocated')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Colaboradores sem alocação no mês' })
  @HttpCode(HttpStatus.OK)
  async getUnallocatedEmployees(
    @Query('month') month: string,
    @Query('format') format: string,
    @Res() res: Response,
  ): Promise<void> {
    const data = await this.analyticsService.getUnallocatedEmployees(month);
    sendResponse(res, data, 'unallocated-employees-' + month, format);
  }

  @Get('analytics/resources/forecast')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Previsão de capacidade para os próximos meses' })
  @HttpCode(HttpStatus.OK)
  async getCapacityForecast(
    @Query('months') months: string,
    @Query('format') format: string,
    @Res() res: Response,
  ): Promise<void> {
    const monthsNum = Number.parseInt(months, 10) || 3;
    const data = await this.analyticsService.getCapacityForecast(monthsNum);
    sendResponse(res, data, 'capacity-forecast', format);
  }

  @Get('analytics/financials/margins')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Margem por consultor no período' })
  @HttpCode(HttpStatus.OK)
  async getConsultantMargin(
    @Query('employeeId') employeeId: string,
    @Query('period') period: string,
    @Query('format') format: string,
    @Res() res: Response,
  ): Promise<void> {
    const data = await this.analyticsService.getConsultantMargin(employeeId, period);
    sendResponse(res, data, 'consultant-margin-' + employeeId + '-' + period, format);
  }

  @Get('analytics/financials/project/:id/profitability')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Rentabilidade de um projeto' })
  @HttpCode(HttpStatus.OK)
  async getProjectProfitability(
    @Param('id') id: string,
    @Query('format') format: string,
    @Res() res: Response,
  ): Promise<void> {
    const data = await this.analyticsService.getProjectProfitability(id);
    sendResponse(
      res,
      data ?? {
        projectId: id,
        projectName: '',
        revenue: 0,
        cost: 0,
        margin: 0,
      },
      'project-profitability-' + id,
      format,
    );
  }

  @Get('analytics/financials/revenue')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Receita mensal agregada por projeto/cliente' })
  @HttpCode(HttpStatus.OK)
  async getMonthlyRevenue(
    @Query('year') year: string,
    @Query('format') format: string,
    @Res() res: Response,
  ): Promise<void> {
    const yearNum = Number.parseInt(year, 10);
    const data = await this.analyticsService.getMonthlyRevenue(yearNum);
    sendResponse(res, data, 'monthly-revenue-' + String(yearNum), format);
  }

  @Get('analytics/financials/top-projects')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Top projetos por margem' })
  @HttpCode(HttpStatus.OK)
  async getTopPerformingProjects(
    @Query('limit') limit: string,
    @Query('format') format: string,
    @Res() res: Response,
  ): Promise<void> {
    const limitNum = Number.parseInt(limit, 10) || 10;
    const data = await this.analyticsService.getTopPerformingProjects(limitNum);
    sendResponse(res, data, 'top-projects', format);
  }
}
