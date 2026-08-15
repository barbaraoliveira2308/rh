import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, LessThanOrEqual, In } from 'typeorm';
import { RoleEnum } from '../../rbac/enums/role.enum';
import { ReportJob } from '../entities/report-job.entity';
import { ReportType } from '../entities/report-type.enum';
import { ReportJobStatus } from '../entities/report-job-status.enum';
import { ReportFormat } from '../entities/report-format.enum';
import { ReportExportersService } from './report-exporters.service';
import { TimesheetPeriod } from '../../timesheets/entities/timesheet-period.entity';
import { TimesheetEntry } from '../../timesheets/entities/timesheet-entry.entity';
import { AbsenceRequest } from '../../absences/entities/absence-request.entity';
import { ExpenseReport } from '../../expenses/entities/expense-report.entity';
import { Project } from '../../projects/entities/project.entity';
import {
  ProjectAllocation,
  AllocationType,
} from '../../projects/entities/project-allocation.entity';
import { TeamMember } from '../../teams/entities/team-member.entity';
import { Employee, EmployeeStatus } from '../../users/entities/employee.entity';
import { Contract, ContractStatus } from '../../contracts/entities/contract.entity';
import { AuditLog } from '../../audit/entities/audit-log.entity';
import { ReportsRabbitmqService } from './reports-rabbitmq.service';
import { StorageService } from '../../storage/services/storage.service';
import type { Readable } from 'stream';

const WORKING_HOURS_PER_MONTH = 168;
const ASYNC_THRESHOLD = 1000;

export interface ReportColumn {
  key: string;
  header: string;
  width?: number;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(ReportJob)
    private readonly jobRepository: Repository<ReportJob>,
    private readonly dataSource: DataSource,
    private readonly exporters: ReportExportersService,
    private readonly rabbitmq: ReportsRabbitmqService,
    private readonly storage: StorageService,
  ) {}

  async resolveEmployeeScope(
    roles: string[],
    callerUserId: string,
    requestedEmployeeId?: string,
  ): Promise<{ employeeId?: string; employeeIds?: string[] }> {
    if (roles.includes(RoleEnum.ADMIN)) {
      return requestedEmployeeId ? { employeeId: requestedEmployeeId } : {};
    }

    const caller = await this.dataSource
      .getRepository(Employee)
      .findOne({ where: { userId: callerUserId } });

    if (!caller) {
      throw new ForbiddenException('Colaborador não encontrado para o utilizador autenticado');
    }

    if (roles.includes(RoleEnum.MANAGER)) {
      const directReports = await this.dataSource.getRepository(Employee).find({
        where: { managerId: caller.id },
        select: ['id'],
      });
      const teamIds = [caller.id, ...directReports.map((employee) => employee.id)];

      if (requestedEmployeeId) {
        if (!teamIds.includes(requestedEmployeeId)) {
          throw new ForbiddenException('Sem acesso aos dados deste colaborador');
        }
        return { employeeId: requestedEmployeeId };
      }

      return { employeeIds: teamIds };
    }

    if (requestedEmployeeId && requestedEmployeeId !== caller.id) {
      throw new ForbiddenException('Sem acesso aos dados deste colaborador');
    }

    return { employeeId: caller.id };
  }

  async generateReport(
    reportType: ReportType,
    filters: Record<string, unknown>,
    format: ReportFormat,
  ): Promise<{ data?: unknown; jobId?: string; buffer?: Buffer; filename?: string }> {
    const rows = await this.fetchRows(reportType, filters);
    const filename = this.buildFilename(reportType, format);

    if (rows.length > ASYNC_THRESHOLD && format !== ReportFormat.JSON) {
      const job = await this.createJob(reportType, filters, format);
      this.rabbitmq.publishReportJob(job.id, reportType, filters, format);
      return { jobId: job.id };
    }

    if (format === ReportFormat.JSON) {
      return { data: rows, filename };
    }

    const columns = this.getColumns(reportType);
    const buffer = await this.exportBuffer(rows, columns, reportType, format);
    return { buffer, filename };
  }

  async generateBuffer(
    reportType: ReportType,
    filters: Record<string, unknown>,
    format: ReportFormat,
  ): Promise<{ buffer: Buffer; rowCount: number }> {
    const rows = await this.fetchRows(reportType, filters);
    const columns = this.getColumns(reportType);
    const buffer = await this.exportBuffer(rows, columns, reportType, format);
    return { buffer, rowCount: rows.length };
  }

  async persistJobResult(
    jobId: string,
    reportType: ReportType,
    format: ReportFormat,
    buffer: Buffer,
  ): Promise<string> {
    const filename = this.buildFilename(reportType, format);
    const key = 'reports/' + jobId + '/' + filename;
    await this.storage.upload(key, buffer, this.contentTypeForFormat(format));
    return key;
  }

  async getJobFile(
    jobId: string,
  ): Promise<{ stream: Readable; contentType: string; filename: string }> {
    const job = await this.findJob(jobId);

    if (job.status !== ReportJobStatus.COMPLETED || !job.resultUrl) {
      throw new BadRequestException('Relatório ainda não está pronto para download');
    }

    const object = await this.storage.getObjectStream(job.resultUrl);
    const filename = job.resultUrl.split('/').pop() ?? jobId + '.' + job.format;

    return {
      stream: object.body,
      contentType: object.contentType ?? this.contentTypeForFormat(job.format as ReportFormat),
      filename,
    };
  }

  contentTypeForFormat(format: ReportFormat): string {
    if (format === ReportFormat.XLSX) {
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    if (format === ReportFormat.PDF) {
      return 'application/pdf';
    }

    return 'application/json';
  }

  async fetchRows(
    reportType: ReportType,
    filters: Record<string, unknown>,
  ): Promise<Record<string, unknown>[]> {
    switch (reportType) {
      case ReportType.TIMESHEETS:
        return this.generateTimesheetReport(filters);
      case ReportType.ABSENCES:
        return this.generateAbsencesReport(filters);
      case ReportType.EXPENSES:
        return this.generateExpensesReport(filters);
      case ReportType.PROJECT_HOURS:
        return this.generateProjectHoursReport(
          this.asString(filters.projectId),
          this.asString(filters.period),
        );
      case ReportType.TEAM_OCCUPANCY:
        return this.generateTeamOccupancyReport(
          this.asString(filters.teamId),
          this.asString(filters.period),
        );
      case ReportType.MARGINS:
        return this.generateMarginReport(
          this.asString(filters.period),
          this.asStringArray(filters.employeeIds),
        );
      case ReportType.CONTRACTS_EXPIRING:
        return this.generateContractsExpiringReport(
          Number(filters.days ?? 30),
          this.asStringArray(filters.employeeIds),
        );
      case ReportType.AUDIT:
        return this.generateAuditReport(filters);
      default:
        throw new BadRequestException('Tipo de relatório desconhecido');
    }
  }

  async generateTimesheetReport(
    filters: Record<string, unknown>,
  ): Promise<Record<string, unknown>[]> {
    const from = this.asString(filters.from);
    const to = this.asString(filters.to);
    const employeeId = this.asString(filters.employeeId);
    const employeeIds = this.asStringArray(filters.employeeIds);
    const projectId = this.asString(filters.projectId);

    const query = this.dataSource
      .getRepository(TimesheetEntry)
      .createQueryBuilder('te')
      .innerJoin(TimesheetPeriod, 'tp', 'te.timesheet_id = tp.id')
      .leftJoin(Project, 'project', 'te.project_id = project.id')
      .leftJoin(Employee, 'employee', 'tp.employee_id = employee.id')
      .where('te.entry_date BETWEEN :from AND :to', { from, to });

    if (employeeId) {
      query.andWhere('tp.employee_id = :employeeId', { employeeId });
    } else if (employeeIds.length > 0) {
      query.andWhere('tp.employee_id IN (:...employeeIds)', { employeeIds });
    }

    if (projectId) {
      query.andWhere('te.project_id = :projectId', { projectId });
    }

    const rows = await query
      .select([
        'tp.employee_id as employee_id',
        "COALESCE(employee.first_name || ' ' || employee.last_name, 'Desconhecido') as employee_name",
        'te.entry_date as entry_date',
        'te.project_id as project_id',
        'project.name as project_name',
        'te.worked_hours as worked_hours',
        'te.overtime_hours as overtime_hours',
      ])
      .orderBy('te.entry_date', 'ASC')
      .getRawMany<{
        employee_id: string;
        employee_name: string;
        entry_date: string;
        project_id: string | null;
        project_name: string | null;
        worked_hours: number;
        overtime_hours: number;
      }>();

    return rows.map((row) => ({
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      entryDate: row.entry_date,
      projectId: row.project_id,
      projectName: row.project_name,
      workedHours: row.worked_hours,
      overtimeHours: row.overtime_hours,
    }));
  }

  async generateAbsencesReport(
    filters: Record<string, unknown>,
  ): Promise<Record<string, unknown>[]> {
    const from = this.asString(filters.from);
    const to = this.asString(filters.to);
    const employeeId = this.asString(filters.employeeId);
    const employeeIds = this.asStringArray(filters.employeeIds);
    const typeId = this.asString(filters.typeId);

    const where: Record<string, unknown> = {};

    if (from && to) {
      where.startDate = Between(from, to);
    }

    if (employeeId) {
      where.employeeId = employeeId;
    } else if (employeeIds.length > 0) {
      where.employeeId = In(employeeIds);
    }

    if (typeId) {
      where.absenceTypeId = typeId;
    }

    const requests = await this.dataSource.getRepository(AbsenceRequest).find({
      where,
      relations: ['employee', 'absenceType'],
      order: { startDate: 'ASC' },
    });

    return requests.map((request) => ({
      employeeId: request.employeeId,
      employeeName: request.employee.firstName + ' ' + request.employee.lastName,
      type: request.absenceType.name,
      startDate: request.startDate,
      endDate: request.endDate,
      totalDays: request.totalDays,
      status: request.status,
    }));
  }

  async generateExpensesReport(
    filters: Record<string, unknown>,
  ): Promise<Record<string, unknown>[]> {
    const from = this.asString(filters.from);
    const to = this.asString(filters.to);
    const employeeId = this.asString(filters.employeeId);
    const employeeIds = this.asStringArray(filters.employeeIds);
    const categoryId = this.asString(filters.categoryId);

    const reportWhere: Record<string, unknown> = {};

    if (employeeId) {
      reportWhere.employeeId = employeeId;
    } else if (employeeIds.length > 0) {
      reportWhere.employeeId = In(employeeIds);
    }

    const reports = await this.dataSource.getRepository(ExpenseReport).find({
      where: reportWhere,
      relations: ['employee', 'items', 'items.category'],
      order: { createdAt: 'DESC' },
    });

    const result: Record<string, unknown>[] = [];

    for (const report of reports) {
      for (const item of report.items) {
        if (from && item.expenseDate < from) {
          continue;
        }

        if (to && item.expenseDate > to) {
          continue;
        }

        if (categoryId && item.categoryId !== categoryId) {
          continue;
        }

        result.push({
          reportId: report.id,
          employeeId: report.employeeId,
          employeeName: report.employee.firstName + ' ' + report.employee.lastName,
          category: item.category.name,
          description: item.description,
          amount: item.amount,
          currency: item.currency,
          expenseDate: item.expenseDate,
          status: report.status,
        });
      }
    }

    return result;
  }

  async generateProjectHoursReport(
    projectId: string,
    period: string,
  ): Promise<Record<string, unknown>[]> {
    if (!projectId) {
      throw new BadRequestException('projectId é obrigatório');
    }

    if (!period) {
      throw new BadRequestException('period é obrigatório');
    }

    const project = await this.dataSource.getRepository(Project).findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Projeto não encontrado');
    }

    const [year, month] = period.split('-').map(Number);
    const startDate = this.firstDayOfMonth(year, month);
    const endDate = this.lastDayOfMonth(year, month);

    const rows = await this.dataSource
      .getRepository(TimesheetEntry)
      .createQueryBuilder('te')
      .innerJoin(TimesheetPeriod, 'tp', 'te.timesheet_id = tp.id')
      .innerJoin(Employee, 'employee', 'tp.employee_id = employee.id')
      .where('te.project_id = :projectId', { projectId })
      .andWhere('te.entry_date BETWEEN :startDate AND :endDate', { startDate, endDate })
      .select([
        'tp.employee_id as employee_id',
        "employee.first_name || ' ' || employee.last_name as employee_name",
        'SUM(te.worked_hours) as total_hours',
        'SUM(te.overtime_hours) as total_overtime',
      ])
      .groupBy('tp.employee_id, employee.first_name, employee.last_name')
      .getRawMany<{
        employee_id: string;
        employee_name: string;
        total_hours: number;
        total_overtime: number;
      }>();

    return rows.map((row) => ({
      projectId,
      projectName: project.name,
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      period,
      totalHours: row.total_hours,
      totalOvertime: row.total_overtime,
    }));
  }

  async generateTeamOccupancyReport(
    teamId: string,
    period: string,
  ): Promise<Record<string, unknown>[]> {
    if (!teamId) {
      throw new BadRequestException('teamId é obrigatório');
    }

    if (!period) {
      throw new BadRequestException('period é obrigatório');
    }

    const team = await this.dataSource.getRepository(TeamMember).findOne({
      where: { teamId },
      relations: ['team'],
    });

    if (!team) {
      throw new NotFoundException('Equipa não encontrada');
    }

    const [year, month] = period.split('-').map(Number);
    const startDate = this.firstDayOfMonth(year, month);
    const endDate = this.lastDayOfMonth(year, month);

    const members = await this.dataSource
      .getRepository(TeamMember)
      .createQueryBuilder('tm')
      .innerJoinAndSelect('tm.employee', 'employee')
      .where('tm.team_id = :teamId', { teamId })
      .andWhere('tm.start_date <= :endDate', { endDate })
      .andWhere('(tm.end_date IS NULL OR tm.end_date >= :startDate)', { startDate })
      .getMany();

    const employeeIds = members.map((member) => member.employeeId);

    if (employeeIds.length === 0) {
      return [];
    }

    const allocations = await this.dataSource
      .getRepository(ProjectAllocation)
      .createQueryBuilder('pa')
      .where('pa.employee_id IN (:...employeeIds)', { employeeIds })
      .andWhere('pa.start_date <= :endDate', { endDate })
      .andWhere('(pa.end_date IS NULL OR pa.end_date >= :startDate)', { startDate })
      .getMany();

    const allocationMap = new Map<string, number>();

    for (const allocation of allocations) {
      const overlapStart = allocation.startDate > startDate ? allocation.startDate : startDate;
      const overlapEnd =
        allocation.endDate && allocation.endDate < endDate ? allocation.endDate : endDate;
      const overlapDays = this.daysBetween(overlapStart, overlapEnd) + 1;
      const monthDays = this.daysBetween(startDate, endDate) + 1;
      const weight = overlapDays / monthDays;

      let value: number;

      if (allocation.allocationType === AllocationType.PERCENTAGE) {
        value = allocation.allocationValue / 100;
      } else {
        value = allocation.allocationValue / WORKING_HOURS_PER_MONTH;
      }

      const current = allocationMap.get(allocation.employeeId) ?? 0;
      allocationMap.set(allocation.employeeId, current + value * weight);
    }

    return members.map((member) => ({
      teamId,
      employeeId: member.employeeId,
      employeeName: member.employee.firstName + ' ' + member.employee.lastName,
      period,
      allocationPercentage:
        Math.round((allocationMap.get(member.employeeId) ?? 0) * 100 * 100) / 100,
    }));
  }

  async generateMarginReport(
    period: string,
    employeeIds: string[] = [],
  ): Promise<Record<string, unknown>[]> {
    if (!period) {
      throw new BadRequestException('period é obrigatório');
    }

    const [year, month] = period.split('-').map(Number);
    const startDate = this.firstDayOfMonth(year, month);
    const endDate = this.lastDayOfMonth(year, month);

    const employees = await this.dataSource.getRepository(Employee).find({
      where:
        employeeIds.length > 0
          ? { status: EmployeeStatus.ACTIVE, id: In(employeeIds) }
          : { status: EmployeeStatus.ACTIVE },
    });

    const result: Record<string, unknown>[] = [];

    for (const employee of employees) {
      const activeContract = await this.dataSource.getRepository(Contract).findOne({
        where: { employeeId: employee.id, status: ContractStatus.ACTIVE },
      });

      const hourlyCost = activeContract?.monthlyCost
        ? activeContract.monthlyCost / WORKING_HOURS_PER_MONTH
        : null;

      const entries = await this.dataSource
        .getRepository(TimesheetEntry)
        .createQueryBuilder('te')
        .innerJoin(TimesheetPeriod, 'tp', 'te.timesheet_id = tp.id')
        .innerJoin(Project, 'project', 'te.project_id = project.id')
        .where('tp.employee_id = :employeeId', { employeeId: employee.id })
        .andWhere('te.project_id IS NOT NULL')
        .andWhere('te.entry_date BETWEEN :startDate AND :endDate', { startDate, endDate })
        .select([
          'project.id as project_id',
          'project.name as project_name',
          'project.hourly_rate as project_hourly_rate',
          'SUM(te.worked_hours) as total_hours',
        ])
        .groupBy('project.id, project.name, project.hourly_rate')
        .getRawMany<{
          project_id: string;
          project_name: string;
          project_hourly_rate: number | null;
          total_hours: number;
        }>();

      for (const entry of entries) {
        const hourlyRate = entry.project_hourly_rate;
        const margin =
          hourlyRate !== null && hourlyCost !== null
            ? (hourlyRate - hourlyCost) * entry.total_hours
            : null;

        result.push({
          employeeId: employee.id,
          employeeName: employee.firstName + ' ' + employee.lastName,
          projectId: entry.project_id,
          projectName: entry.project_name,
          period,
          hourlyRate,
          hourlyCost,
          hoursWorked: entry.total_hours,
          margin,
        });
      }
    }

    return result;
  }

  async generateContractsExpiringReport(
    daysAhead: number,
    employeeIds: string[] = [],
  ): Promise<Record<string, unknown>[]> {
    const today = new Date();
    const limit = new Date(today);
    limit.setDate(today.getDate() + daysAhead);
    const limitStr = limit.toISOString().split('T')[0];

    const contracts = await this.dataSource.getRepository(Contract).find({
      where: {
        status: ContractStatus.ACTIVE,
        endDate: LessThanOrEqual(limitStr),
        ...(employeeIds.length > 0 ? { employeeId: In(employeeIds) } : {}),
      },
      relations: ['employee'],
      order: { endDate: 'ASC' },
    });

    return contracts
      .filter(
        (contract): contract is typeof contract & { endDate: string } => contract.endDate !== null,
      )
      .map((contract) => ({
        contractId: contract.id,
        employeeId: contract.employeeId,
        employeeName: contract.employee.firstName + ' ' + contract.employee.lastName,
        contractType: contract.contractType,
        startDate: contract.startDate,
        endDate: contract.endDate,
        daysRemaining: this.daysBetween(today.toISOString().split('T')[0], contract.endDate),
      }));
  }

  async generateAuditReport(filters: Record<string, unknown>): Promise<Record<string, unknown>[]> {
    const from = this.asString(filters.from);
    const to = this.asString(filters.to);
    const userId = this.asString(filters.userId);
    const action = this.asString(filters.action);

    const where: Record<string, unknown> = {};

    if (from && to) {
      where.timestamp = Between(new Date(from), new Date(to));
    }

    if (userId) {
      where.userId = userId;
    }

    if (action) {
      where.action = action;
    }

    const logs = await this.dataSource.getRepository(AuditLog).find({
      where,
      relations: ['user'],
      order: { timestamp: 'DESC' },
      take: 10000,
    });

    return logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      userEmail: log.user?.email ?? null,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      module: log.module,
      timestamp: log.timestamp,
      ipAddress: log.ipAddress,
    }));
  }

  getColumns(reportType: ReportType): ReportColumn[] {
    switch (reportType) {
      case ReportType.TIMESHEETS:
        return [
          { key: 'employeeId', header: 'Colaborador ID' },
          { key: 'employeeName', header: 'Colaborador' },
          { key: 'entryDate', header: 'Data' },
          { key: 'projectId', header: 'Projeto ID' },
          { key: 'projectName', header: 'Projeto' },
          { key: 'workedHours', header: 'Horas Trabalhadas' },
          { key: 'overtimeHours', header: 'Horas Extra' },
        ];
      case ReportType.ABSENCES:
        return [
          { key: 'employeeId', header: 'Colaborador ID' },
          { key: 'employeeName', header: 'Colaborador' },
          { key: 'type', header: 'Tipo' },
          { key: 'startDate', header: 'Data Início' },
          { key: 'endDate', header: 'Data Fim' },
          { key: 'totalDays', header: 'Dias' },
          { key: 'status', header: 'Estado' },
        ];
      case ReportType.EXPENSES:
        return [
          { key: 'reportId', header: 'Relatório ID' },
          { key: 'employeeId', header: 'Colaborador ID' },
          { key: 'employeeName', header: 'Colaborador' },
          { key: 'category', header: 'Categoria' },
          { key: 'description', header: 'Descrição' },
          { key: 'amount', header: 'Valor' },
          { key: 'currency', header: 'Moeda' },
          { key: 'expenseDate', header: 'Data Despesa' },
          { key: 'status', header: 'Estado' },
        ];
      case ReportType.PROJECT_HOURS:
        return [
          { key: 'projectId', header: 'Projeto ID' },
          { key: 'projectName', header: 'Projeto' },
          { key: 'employeeId', header: 'Colaborador ID' },
          { key: 'employeeName', header: 'Colaborador' },
          { key: 'period', header: 'Período' },
          { key: 'totalHours', header: 'Total Horas' },
          { key: 'totalOvertime', header: 'Total Extra' },
        ];
      case ReportType.TEAM_OCCUPANCY:
        return [
          { key: 'teamId', header: 'Equipa ID' },
          { key: 'employeeId', header: 'Colaborador ID' },
          { key: 'employeeName', header: 'Colaborador' },
          { key: 'period', header: 'Período' },
          { key: 'allocationPercentage', header: 'Ocupação %' },
        ];
      case ReportType.MARGINS:
        return [
          { key: 'employeeId', header: 'Colaborador ID' },
          { key: 'employeeName', header: 'Colaborador' },
          { key: 'projectId', header: 'Projeto ID' },
          { key: 'projectName', header: 'Projeto' },
          { key: 'period', header: 'Período' },
          { key: 'hourlyRate', header: 'Taxa Horária' },
          { key: 'hourlyCost', header: 'Custo Horário' },
          { key: 'hoursWorked', header: 'Horas' },
          { key: 'margin', header: 'Margem' },
        ];
      case ReportType.CONTRACTS_EXPIRING:
        return [
          { key: 'contractId', header: 'Contrato ID' },
          { key: 'employeeId', header: 'Colaborador ID' },
          { key: 'employeeName', header: 'Colaborador' },
          { key: 'contractType', header: 'Tipo' },
          { key: 'startDate', header: 'Data Início' },
          { key: 'endDate', header: 'Data Fim' },
          { key: 'daysRemaining', header: 'Dias Restantes' },
        ];
      case ReportType.AUDIT:
        return [
          { key: 'id', header: 'ID' },
          { key: 'userId', header: 'Utilizador ID' },
          { key: 'userEmail', header: 'Email' },
          { key: 'action', header: 'Ação' },
          { key: 'entityType', header: 'Entidade' },
          { key: 'entityId', header: 'Entidade ID' },
          { key: 'module', header: 'Módulo' },
          { key: 'timestamp', header: 'Data/Hora' },
          { key: 'ipAddress', header: 'IP' },
        ];
      default:
        return [];
    }
  }

  async createJob(
    reportType: ReportType,
    filters: Record<string, unknown>,
    format: ReportFormat,
    scheduledReportId?: string,
  ): Promise<ReportJob> {
    const job = this.jobRepository.create({
      reportType,
      filters,
      format,
      status: ReportJobStatus.PENDING,
      scheduledReportId: scheduledReportId ?? null,
    });

    return this.jobRepository.save(job);
  }

  async findJob(jobId: string): Promise<ReportJob> {
    const job = await this.jobRepository.findOne({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException('Job não encontrado');
    }

    return job;
  }

  async updateJobStatus(
    jobId: string,
    status: ReportJobStatus,
    options: { resultUrl?: string; errorMessage?: string; rowCount?: number } = {},
  ): Promise<void> {
    await this.jobRepository.update(jobId, {
      status,
      resultUrl: options.resultUrl ?? null,
      errorMessage: options.errorMessage ?? null,
      rowCount: options.rowCount ?? null,
      completedAt:
        status === ReportJobStatus.COMPLETED || status === ReportJobStatus.FAILED
          ? new Date()
          : null,
    });
  }

  private asString(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    return '';
  }

  private asStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is string => typeof item === 'string');
  }

  private async exportBuffer(
    rows: Record<string, unknown>[],
    columns: ReportColumn[],
    reportType: ReportType,
    format: ReportFormat,
  ): Promise<Buffer> {
    if (format === ReportFormat.XLSX) {
      return this.exporters.generateExcel(rows, columns, reportType);
    }

    if (format === ReportFormat.PDF) {
      return this.exporters.generatePdf(rows, columns, 'Relatório: ' + reportType);
    }

    throw new BadRequestException('Formato não suportado');
  }

  private buildFilename(reportType: ReportType, format: ReportFormat): string {
    return reportType + '-' + String(Date.now()) + '.' + format;
  }

  private firstDayOfMonth(year: number, month: number): string {
    return String(year) + '-' + String(month).padStart(2, '0') + '-01';
  }

  private lastDayOfMonth(year: number, month: number): string {
    const date = new Date(year, month, 0);
    return (
      String(year) +
      '-' +
      String(month).padStart(2, '0') +
      '-' +
      String(date.getDate()).padStart(2, '0')
    );
  }

  private daysBetween(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }
}
