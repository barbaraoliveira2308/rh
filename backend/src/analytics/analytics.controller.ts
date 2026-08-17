import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AnalyticsService } from './services/analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { Roles } from '../rbac/decorators/roles.decorator';
import { RoleEnum } from '../rbac/enums/role.enum';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { EmployeeIdentityService } from '../auth/services/employee-identity.service';
import { ReportExportersService } from '../reports/services/report-exporters.service';

interface ExportColumn {
  key: string;
  header: string;
  width?: number;
}

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

async function sendResponse(
  res: Response,
  data: unknown,
  filename: string,
  format: string | undefined,
  exporters?: { service: ReportExportersService; columns: ExportColumn[]; title: string },
): Promise<void> {
  const rows = Array.isArray(data) ? data : [data];

  if (format === 'csv') {
    const csv = toCsv(rows as Record<string, unknown>[]);

    res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '.csv"');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.send(csv);
    return;
  }

  if (format === 'xlsx' || format === 'pdf') {
    if (!exporters) {
      throw new BadRequestException('Formato "' + format + '" não suportado neste endpoint');
    }

    if (format === 'xlsx') {
      const buffer = await exporters.service.generateExcel(
        rows as Record<string, unknown>[],
        exporters.columns,
        exporters.title,
      );

      res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '.xlsx"');
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.send(buffer);
      return;
    }

    const buffer = await exporters.service.generatePdf(
      rows as Record<string, unknown>[],
      exporters.columns,
      exporters.title,
    );

    res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '.pdf"');
    res.setHeader('Content-Type', 'application/pdf');
    res.send(buffer);
    return;
  }

  res.json(data);
}

@Controller()
@ApiTags('Analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly employeeIdentity: EmployeeIdentityService,
    private readonly reportExporters: ReportExportersService,
  ) {}

  @Get('analytics/resources/my-occupancy')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Ocupação do próprio colaborador autenticado' })
  @HttpCode(HttpStatus.OK)
  async getMyOccupancy(
    @Req() req: Request,
    @Query('month') month: string,
    @Query('format') format: string,
    @Res() res: Response,
  ): Promise<void> {
    const user = req.user as JwtPayload;
    const employeeId = await this.employeeIdentity.resolveEmployeeId(user.sub);
    const data = await this.analyticsService.getEmployeeOccupancy(employeeId, month);
    await sendResponse(res, data, 'my-occupancy-' + month, format);
  }

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
    await sendResponse(res, data, 'team-occupancy-' + month, format);
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
    await sendResponse(res, data, 'unallocated-employees-' + month, format);
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
    await sendResponse(res, data, 'capacity-forecast', format);
  }

  @Get('analytics/financials/margins')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Margem por consultor no período' })
  @HttpCode(HttpStatus.OK)
  async getConsultantMargin(
    @Query('employeeId') employeeId: string,
    @Query('period') period: string,
    @Query('format') format: string,
    @Res() res: Response,
  ): Promise<void> {
    const data = await this.analyticsService.getConsultantMargin(employeeId, period);
    await sendResponse(res, data, 'consultant-margin-' + employeeId + '-' + period, format, {
      service: this.reportExporters,
      title: 'Margem por Consultor',
      columns: [
        { key: 'employeeId', header: 'ID Colaborador' },
        { key: 'employeeName', header: 'Colaborador' },
        { key: 'period', header: 'Período' },
        { key: 'hourlyRate', header: 'Taxa Horária' },
        { key: 'hourlyCost', header: 'Custo Horário' },
        { key: 'hoursWorked', header: 'Horas Trabalhadas' },
        { key: 'margin', header: 'Margem' },
      ],
    });
  }

  @Get('analytics/financials/project/:id/profitability')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Rentabilidade de um projeto' })
  @HttpCode(HttpStatus.OK)
  async getProjectProfitability(
    @Param('id') id: string,
    @Query('format') format: string,
    @Res() res: Response,
  ): Promise<void> {
    const data = await this.analyticsService.getProjectProfitability(id);
    await sendResponse(
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
      {
        service: this.reportExporters,
        title: 'Rentabilidade de Projeto',
        columns: [
          { key: 'projectId', header: 'ID Projeto' },
          { key: 'projectName', header: 'Projeto' },
          { key: 'revenue', header: 'Receita' },
          { key: 'cost', header: 'Custo' },
          { key: 'margin', header: 'Margem' },
        ],
      },
    );
  }

  @Get('analytics/financials/revenue')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Receita mensal agregada por projeto/cliente' })
  @HttpCode(HttpStatus.OK)
  async getMonthlyRevenue(
    @Query('year') year: string,
    @Query('format') format: string,
    @Res() res: Response,
  ): Promise<void> {
    const yearNum = Number.parseInt(year, 10);
    const data = await this.analyticsService.getMonthlyRevenue(yearNum);
    await sendResponse(res, data, 'monthly-revenue-' + String(yearNum), format, {
      service: this.reportExporters,
      title: 'Receita Mensal',
      columns: [
        { key: 'month', header: 'Mês' },
        { key: 'projectId', header: 'ID Projeto' },
        { key: 'projectName', header: 'Projeto' },
        { key: 'clientId', header: 'ID Cliente' },
        { key: 'revenue', header: 'Receita' },
      ],
    });
  }

  @Get('analytics/financials/top-projects')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Top projetos por margem' })
  @HttpCode(HttpStatus.OK)
  async getTopPerformingProjects(
    @Query('limit') limit: string,
    @Query('format') format: string,
    @Res() res: Response,
  ): Promise<void> {
    const limitNum = Number.parseInt(limit, 10) || 10;
    const data = await this.analyticsService.getTopPerformingProjects(limitNum);
    await sendResponse(res, data, 'top-projects', format, {
      service: this.reportExporters,
      title: 'Top Projetos por Margem',
      columns: [
        { key: 'projectId', header: 'ID Projeto' },
        { key: 'projectName', header: 'Projeto' },
        { key: 'margin', header: 'Margem' },
        { key: 'revenue', header: 'Receita' },
        { key: 'cost', header: 'Custo' },
      ],
    });
  }
}
