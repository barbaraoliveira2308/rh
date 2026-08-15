import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { TimesheetsService } from './services/timesheets.service';
import { TimesheetPeriod } from './entities/timesheet-period.entity';
import { TimesheetEntry } from './entities/timesheet-entry.entity';
import { TimesheetStatus } from './entities/timesheet-status.enum';
import { CreateTimesheetEntryDto } from './dto/create-timesheet-entry.dto';
import { ApproveTimesheetDto } from './dto/approve-timesheet.dto';
import { RejectTimesheetDto } from './dto/reject-timesheet.dto';
import { BulkApproveDto } from './dto/bulk-approve.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { Roles } from '../rbac/decorators/roles.decorator';
import { RoleEnum } from '../rbac/enums/role.enum';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { EmployeeIdentityService } from '../auth/services/employee-identity.service';

@Controller()
@ApiTags('Timesheets')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TimesheetsController {
  constructor(
    private readonly timesheetsService: TimesheetsService,
    private readonly employeeIdentity: EmployeeIdentityService,
  ) {}

  @Get('timesheets')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Listar folhas de horas (com filtros)' })
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('employee_id') employeeId?: string,
    @Query('year') year?: number,
    @Query('month') month?: number,
    @Query('status') status?: TimesheetStatus,
  ): Promise<TimesheetPeriod[]> {
    return this.timesheetsService.findAll({ employeeId, year, month, status });
  }

  @Get('timesheets/export')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER)
  @ApiOperation({ summary: 'Exportar folhas de horas (CSV/XLSX)' })
  @HttpCode(HttpStatus.OK)
  async export(
    @Query('month') month: string,
    @Query('format') format: string,
    @Res() res: Response,
  ): Promise<void> {
    const [yearStr, monthStr] = month.split('-');
    const year = Number(yearStr);
    const monthNum = Number(monthStr);

    const periods = await this.timesheetsService.findAll({ year, month: monthNum });

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=timesheets.csv');

      let csv = 'employee_id,period,total_worked,total_planned,status\n';
      for (const p of periods) {
        csv +=
          p.employeeId +
          ',' +
          String(p.periodYear) +
          '-' +
          String(p.periodMonth).padStart(2, '0') +
          ',' +
          String(p.totalWorkedHours) +
          ',' +
          String(p.totalPlannedHours) +
          ',' +
          p.status +
          '\n';
      }

      res.send(csv);
    } else {
      res.status(HttpStatus.BAD_REQUEST).json({ message: 'Formato não suportado. Use csv.' });
    }
  }

  @Get('timesheets/:id')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Obter folha de horas por ID' })
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string, @Req() req: Request): Promise<TimesheetPeriod> {
    const user = req.user as JwtPayload;
    const isAdmin = user.roles.includes(RoleEnum.ADMIN);

    if (!isAdmin) {
      const period = await this.timesheetsService.findOne(id);
      const callerEmployeeId = await this.employeeIdentity.resolveEmployeeId(user.sub);
      const isOwner = period.employeeId === callerEmployeeId;

      if (
        !isOwner &&
        !user.roles.includes(RoleEnum.MANAGER) &&
        !user.roles.includes(RoleEnum.APPROVER)
      ) {
        throw new ForbiddenException('Acesso negado a esta folha de horas');
      }
    }

    return this.timesheetsService.findOne(id);
  }

  @Patch('timesheets/:id/entries/:entryId')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Atualizar entrada da folha (próprio, apenas em DRAFT)' })
  @HttpCode(HttpStatus.OK)
  async updateEntry(
    @Param('id') id: string,
    @Param('entryId') entryId: string,
    @Body() dto: CreateTimesheetEntryDto,
    @Req() req: Request,
  ): Promise<TimesheetEntry> {
    const user = req.user as JwtPayload;
    const employeeId = await this.employeeIdentity.resolveEmployeeId(user.sub);
    return this.timesheetsService.updateEntry(id, entryId, employeeId, dto);
  }

  @Post('timesheets/:id/submit')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Submeter folha de horas para aprovação' })
  @HttpCode(HttpStatus.OK)
  async submit(@Param('id') id: string, @Req() req: Request): Promise<TimesheetPeriod> {
    const user = req.user as JwtPayload;
    const employeeId = await this.employeeIdentity.resolveEmployeeId(user.sub);
    return this.timesheetsService.submitForApproval(id, employeeId);
  }

  @Post('timesheets/:id/approve')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER)
  @ApiOperation({ summary: 'Aprovar folha de horas' })
  @HttpCode(HttpStatus.OK)
  async approve(
    @Param('id') id: string,
    @Body() dto: ApproveTimesheetDto,
    @Req() req: Request,
  ): Promise<TimesheetPeriod> {
    const user = req.user as JwtPayload;
    const approverId = await this.employeeIdentity.resolveEmployeeId(user.sub);
    return this.timesheetsService.approve(id, approverId, dto.comment);
  }

  @Post('timesheets/:id/reject')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER)
  @ApiOperation({ summary: 'Rejeitar folha de horas' })
  @HttpCode(HttpStatus.OK)
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectTimesheetDto,
    @Req() req: Request,
  ): Promise<TimesheetPeriod> {
    const user = req.user as JwtPayload;
    const approverId = await this.employeeIdentity.resolveEmployeeId(user.sub);
    return this.timesheetsService.reject(id, approverId, dto.reason);
  }

  @Post('timesheets/bulk-approve')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER)
  @ApiOperation({ summary: 'Aprovação em massa de folhas de horas' })
  @HttpCode(HttpStatus.OK)
  async bulkApprove(@Body() dto: BulkApproveDto, @Req() req: Request): Promise<TimesheetPeriod[]> {
    const user = req.user as JwtPayload;
    const approverId = await this.employeeIdentity.resolveEmployeeId(user.sub);
    return this.timesheetsService.bulkApprove(dto.ids, approverId);
  }
}
