import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Res,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './services/reports.service';
import { ScheduledReportsService } from './services/scheduled-reports.service';
import { CreateScheduledReportDto } from './dto/create-scheduled-report.dto';
import { ScheduledReportResponseDto } from './dto/scheduled-report-response.dto';
import { ReportJob } from './entities/report-job.entity';
import { ReportType } from './entities/report-type.enum';
import { ReportFormat } from './entities/report-format.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { Roles } from '../rbac/decorators/roles.decorator';
import { RoleEnum } from '../rbac/enums/role.enum';

function parseFormat(format?: string): ReportFormat {
  const value = format ?? 'json';

  if (!Object.values(ReportFormat).includes(value as ReportFormat)) {
    throw new BadRequestException('Formato inválido: ' + value);
  }

  return value as ReportFormat;
}

@ApiTags('Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly scheduledReportsService: ScheduledReportsService,
  ) {}

  @Get('timesheets')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Relatório de horas por colaborador/projeto/período' })
  @HttpCode(HttpStatus.OK)
  async getTimesheetsReport(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('employeeId') employeeId: string,
    @Query('projectId') projectId: string,
    @Query('format') format: string,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.reportsService.generateReport(
      ReportType.TIMESHEETS,
      {
        from,
        to,
        employeeId,
        projectId,
      },
      parseFormat(format),
    );

    this.sendResult(res, result, 'timesheets');
  }

  @Get('absences')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Relatório de ausências por tipo/colaborador/período' })
  @HttpCode(HttpStatus.OK)
  async getAbsencesReport(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('employeeId') employeeId: string,
    @Query('typeId') typeId: string,
    @Query('format') format: string,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.reportsService.generateReport(
      ReportType.ABSENCES,
      {
        from,
        to,
        employeeId,
        typeId,
      },
      parseFormat(format),
    );

    this.sendResult(res, result, 'absences');
  }

  @Get('expenses')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Relatório de despesas por categoria/colaborador/período' })
  @HttpCode(HttpStatus.OK)
  async getExpensesReport(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('employeeId') employeeId: string,
    @Query('categoryId') categoryId: string,
    @Query('format') format: string,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.reportsService.generateReport(
      ReportType.EXPENSES,
      {
        from,
        to,
        employeeId,
        categoryId,
      },
      parseFormat(format),
    );

    this.sendResult(res, result, 'expenses');
  }

  @Get('projects/:id/hours')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Horas registadas num projeto no período' })
  @HttpCode(HttpStatus.OK)
  async getProjectHoursReport(
    @Param('id') id: string,
    @Query('period') period: string,
    @Query('format') format: string,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.reportsService.generateReport(
      ReportType.PROJECT_HOURS,
      { projectId: id, period },
      parseFormat(format),
    );

    this.sendResult(res, result, 'project-hours-' + id);
  }

  @Get('teams/:id/occupancy')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Ocupação de uma equipa no período' })
  @HttpCode(HttpStatus.OK)
  async getTeamOccupancyReport(
    @Param('id') id: string,
    @Query('period') period: string,
    @Query('format') format: string,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.reportsService.generateReport(
      ReportType.TEAM_OCCUPANCY,
      { teamId: id, period },
      parseFormat(format),
    );

    this.sendResult(res, result, 'team-occupancy-' + id);
  }

  @Get('financials/margins')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Margem por consultor no período' })
  @HttpCode(HttpStatus.OK)
  async getMarginReport(
    @Query('period') period: string,
    @Query('format') format: string,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.reportsService.generateReport(
      ReportType.MARGINS,
      { period },
      parseFormat(format),
    );

    this.sendResult(res, result, 'margins');
  }

  @Get('contracts/expiring')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Contratos próximos da expiração' })
  @HttpCode(HttpStatus.OK)
  async getContractsExpiringReport(
    @Query('days') days: string,
    @Query('format') format: string,
    @Res() res: Response,
  ): Promise<void> {
    const daysNum = days ? Number.parseInt(days, 10) : 30;
    const result = await this.reportsService.generateReport(
      ReportType.CONTRACTS_EXPIRING,
      { days: daysNum },
      parseFormat(format),
    );

    this.sendResult(res, result, 'contracts-expiring');
  }

  @Get('audit')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Relatório de auditoria' })
  @HttpCode(HttpStatus.OK)
  async getAuditReport(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('userId') userId: string,
    @Query('action') action: string,
    @Query('format') format: string,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.reportsService.generateReport(
      ReportType.AUDIT,
      {
        from,
        to,
        userId,
        action,
      },
      parseFormat(format),
    );

    this.sendResult(res, result, 'audit');
  }

  @Get('jobs/:jobId')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Estado de um job de relatório assíncrono' })
  @HttpCode(HttpStatus.OK)
  async getJobStatus(@Param('jobId') jobId: string): Promise<ReportJob> {
    return this.reportsService.findJob(jobId);
  }

  @Get('jobs/:jobId/download')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Download do relatório de um job concluído (transmitido pelo backend)' })
  @HttpCode(HttpStatus.OK)
  async downloadJob(@Param('jobId') jobId: string, @Res() res: Response): Promise<void> {
    const file = await this.reportsService.getJobFile(jobId);
    res.setHeader('Content-Disposition', 'attachment; filename="' + file.filename + '"');
    res.setHeader('Content-Type', file.contentType);
    file.stream.pipe(res);
  }

  @Get('schedules')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Listar relatórios agendados' })
  @HttpCode(HttpStatus.OK)
  async getSchedules(): Promise<ScheduledReportResponseDto[]> {
    return this.scheduledReportsService.findAll();
  }

  @Post('schedules')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Criar relatório agendado' })
  @HttpCode(HttpStatus.CREATED)
  async createSchedule(@Body() dto: CreateScheduledReportDto): Promise<ScheduledReportResponseDto> {
    return this.scheduledReportsService.create(dto);
  }

  @Delete('schedules/:id')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Remover relatório agendado' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSchedule(@Param('id') id: string): Promise<void> {
    await this.scheduledReportsService.remove(id);
  }

  private sendResult(
    res: Response,
    result: { data?: unknown; jobId?: string; buffer?: Buffer; filename?: string },
    _baseName: string,
  ): void {
    if (result.jobId) {
      res.status(HttpStatus.ACCEPTED).json({ jobId: result.jobId, status: 'pending' });
      return;
    }

    if (result.buffer && result.filename) {
      res.setHeader('Content-Disposition', 'attachment; filename="' + result.filename + '"');
      res.setHeader('Content-Type', this.contentTypeFor(result.filename));
      res.send(result.buffer);
      return;
    }

    res.json(result.data);
  }

  private contentTypeFor(filename: string): string {
    if (filename.endsWith('.xlsx')) {
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    if (filename.endsWith('.pdf')) {
      return 'application/pdf';
    }

    return 'application/octet-stream';
  }
}
