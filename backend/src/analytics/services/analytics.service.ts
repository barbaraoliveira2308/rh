import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { RedisCacheService } from '../../cache/redis-cache.service';
import { CacheResult } from '../../cache/cache-result.decorator';
import {
  ProjectAllocation,
  AllocationType,
} from '../../projects/entities/project-allocation.entity';
import { Project, ProjectStatus } from '../../projects/entities/project.entity';
import { Employee, EmployeeStatus } from '../../users/entities/employee.entity';
import { TeamMember } from '../../teams/entities/team-member.entity';
import { TimesheetEntry } from '../../timesheets/entities/timesheet-entry.entity';
import { TimesheetPeriod } from '../../timesheets/entities/timesheet-period.entity';
import { Contract, ContractStatus } from '../../contracts/entities/contract.entity';
import {
  TeamOccupancyDto,
  ProjectAllocationMapDto,
  UnallocatedEmployeeDto,
  CapacityForecastDto,
  ConsultantMarginDto,
  ProjectProfitabilityDto,
  MonthlyRevenueDto,
  TopPerformingProjectDto,
} from '../dto/analytics-response.dto';

const WORKING_HOURS_PER_MONTH = 168;

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly dataSource: DataSource,
    readonly redisCacheService: RedisCacheService,
  ) {}

  @CacheResult(300)
  async getTeamOccupancy(teamId: string, month: string): Promise<TeamOccupancyDto[]> {
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = this.firstDayOfMonth(year, monthNum);
    const endDate = this.lastDayOfMonth(year, monthNum);

    const members = await this.dataSource
      .getRepository(TeamMember)
      .createQueryBuilder('tm')
      .innerJoinAndSelect('tm.employee', 'employee')
      .where('tm.team_id = :teamId', { teamId })
      .andWhere('tm.start_date <= :endDate', { endDate })
      .andWhere('(tm.end_date IS NULL OR tm.end_date >= :startDate)', { startDate })
      .getMany();

    const employeeIds = members.map((m) => m.employeeId);

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
      employeeId: member.employeeId,
      employeeName: member.employee.firstName + ' ' + member.employee.lastName,
      allocationPercentage:
        Math.round((allocationMap.get(member.employeeId) ?? 0) * 100 * 100) / 100,
    }));
  }

  @CacheResult(300)
  async getEmployeeOccupancy(employeeId: string, month: string): Promise<TeamOccupancyDto | null> {
    const employee = await this.employeeRepository.findOne({ where: { id: employeeId } });

    if (!employee) {
      return null;
    }

    const [year, monthNum] = month.split('-').map(Number);
    const startDate = this.firstDayOfMonth(year, monthNum);
    const endDate = this.lastDayOfMonth(year, monthNum);

    const allocations = await this.dataSource
      .getRepository(ProjectAllocation)
      .createQueryBuilder('pa')
      .where('pa.employee_id = :employeeId', { employeeId })
      .andWhere('pa.start_date <= :endDate', { endDate })
      .andWhere('(pa.end_date IS NULL OR pa.end_date >= :startDate)', { startDate })
      .getMany();

    let allocated = 0;

    for (const allocation of allocations) {
      const overlapStart = allocation.startDate > startDate ? allocation.startDate : startDate;
      const overlapEnd =
        allocation.endDate && allocation.endDate < endDate ? allocation.endDate : endDate;
      const overlapDays = this.daysBetween(overlapStart, overlapEnd) + 1;
      const monthDays = this.daysBetween(startDate, endDate) + 1;
      const weight = overlapDays / monthDays;

      const value =
        allocation.allocationType === AllocationType.PERCENTAGE
          ? allocation.allocationValue / 100
          : allocation.allocationValue / WORKING_HOURS_PER_MONTH;

      allocated += value * weight;
    }

    return {
      employeeId,
      employeeName: employee.firstName + ' ' + employee.lastName,
      allocationPercentage: Math.round(allocated * 100 * 100) / 100,
    };
  }

  @CacheResult(300)
  async getProjectAllocationMap(month: string): Promise<ProjectAllocationMapDto[]> {
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = this.firstDayOfMonth(year, monthNum);
    const endDate = this.lastDayOfMonth(year, monthNum);

    const allocations = await this.dataSource
      .getRepository(ProjectAllocation)
      .createQueryBuilder('pa')
      .innerJoinAndSelect('pa.project', 'project')
      .where('pa.start_date <= :endDate', { endDate })
      .andWhere('(pa.end_date IS NULL OR pa.end_date >= :startDate)', { startDate })
      .getMany();

    const projectMap = new Map<string, { name: string; value: number }>();

    for (const allocation of allocations) {
      const overlapStart = allocation.startDate > startDate ? allocation.startDate : startDate;
      const overlapEnd =
        allocation.endDate && allocation.endDate < endDate ? allocation.endDate : endDate;
      const overlapDays = this.daysBetween(overlapStart, overlapEnd) + 1;
      const monthDays = this.daysBetween(startDate, endDate) + 1;
      const weight = overlapDays / monthDays;

      let allocationValue: number;

      if (allocation.allocationType === AllocationType.PERCENTAGE) {
        allocationValue = allocation.allocationValue / 100;
      } else {
        allocationValue = allocation.allocationValue / WORKING_HOURS_PER_MONTH;
      }

      const current = projectMap.get(allocation.projectId) ?? {
        name: allocation.project.name,
        value: 0,
      };
      current.value += allocationValue * weight;
      projectMap.set(allocation.projectId, current);
    }

    return Array.from(projectMap.entries()).map(([projectId, data]) => ({
      projectId,
      projectName: data.name,
      totalAllocationPercentage: Math.round(data.value * 100 * 100) / 100,
    }));
  }

  @CacheResult(300)
  async getUnallocatedEmployees(month: string): Promise<UnallocatedEmployeeDto[]> {
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = this.firstDayOfMonth(year, monthNum);
    const endDate = this.lastDayOfMonth(year, monthNum);

    const activeEmployees = await this.employeeRepository.find({
      where: { status: EmployeeStatus.ACTIVE },
    });

    if (activeEmployees.length === 0) {
      return [];
    }

    const employeeIds = activeEmployees.map((e) => e.id);

    const allocatedIds = await this.dataSource
      .getRepository(ProjectAllocation)
      .createQueryBuilder('pa')
      .select('DISTINCT pa.employee_id', 'employeeId')
      .where('pa.employee_id IN (:...employeeIds)', { employeeIds })
      .andWhere('pa.start_date <= :endDate', { endDate })
      .andWhere('(pa.end_date IS NULL OR pa.end_date >= :startDate)', { startDate })
      .getRawMany<{ employeeId: string }>();

    const allocatedSet = new Set(allocatedIds.map((row) => row.employeeId));

    return activeEmployees
      .filter((employee) => !allocatedSet.has(employee.id))
      .map((employee) => ({
        employeeId: employee.id,
        employeeName: employee.firstName + ' ' + employee.lastName,
      }));
  }

  @CacheResult(300)
  async getCapacityForecast(months = 3): Promise<CapacityForecastDto[]> {
    const activeEmployees = await this.employeeRepository.count({
      where: { status: EmployeeStatus.ACTIVE },
    });

    const totalCapacity = activeEmployees * 1;
    const result: CapacityForecastDto[] = [];
    const today = new Date();

    for (let i = 0; i < months; i++) {
      const forecastDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const year = forecastDate.getFullYear();
      const month = forecastDate.getMonth() + 1;
      const startDate = this.firstDayOfMonth(year, month);
      const endDate = this.lastDayOfMonth(year, month);

      const allocations = await this.dataSource
        .getRepository(ProjectAllocation)
        .createQueryBuilder('pa')
        .where('pa.start_date <= :endDate', { endDate })
        .andWhere('(pa.end_date IS NULL OR pa.end_date >= :startDate)', { startDate })
        .getMany();

      let allocatedCapacity = 0;

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

        allocatedCapacity += value * weight;
      }

      const monthKey = String(year) + '-' + String(month).padStart(2, '0');

      result.push({
        month: monthKey,
        totalCapacity,
        allocatedCapacity: Math.round(allocatedCapacity * 100) / 100,
        availableCapacity: Math.round((totalCapacity - allocatedCapacity) * 100) / 100,
      });
    }

    return result;
  }

  @CacheResult(300)
  async getConsultantMargin(employeeId: string, period: string): Promise<ConsultantMarginDto[]> {
    const [year, month] = period.split('-').map(Number);
    const startDate = this.firstDayOfMonth(year, month);
    const endDate = this.lastDayOfMonth(year, month);

    const employee = await this.employeeRepository.findOne({ where: { id: employeeId } });

    if (!employee) {
      return [];
    }

    const activeContract = await this.contractRepository.findOne({
      where: {
        employeeId,
        status: ContractStatus.ACTIVE,
      },
    });

    const hourlyCost = activeContract?.monthlyCost
      ? activeContract.monthlyCost / WORKING_HOURS_PER_MONTH
      : null;

    const entries = await this.dataSource
      .getRepository(TimesheetEntry)
      .createQueryBuilder('te')
      .innerJoin(TimesheetPeriod, 'tp', 'te.timesheet_id = tp.id')
      .innerJoin(Project, 'project', 'te.project_id = project.id')
      .where('tp.employee_id = :employeeId', { employeeId })
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

    return entries.map((entry) => {
      const hourlyRate = entry.project_hourly_rate;
      const margin =
        hourlyRate !== null && hourlyCost !== null
          ? (hourlyRate - hourlyCost) * entry.total_hours
          : null;

      return {
        employeeId,
        employeeName: employee.firstName + ' ' + employee.lastName,
        period,
        hourlyRate,
        hourlyCost,
        hoursWorked: entry.total_hours,
        margin,
      };
    });
  }

  @CacheResult(300)
  async getProjectProfitability(projectId: string): Promise<ProjectProfitabilityDto | null> {
    const project = await this.projectRepository.findOne({ where: { id: projectId } });

    if (!project) {
      return null;
    }

    const entries = await this.dataSource
      .getRepository(TimesheetEntry)
      .createQueryBuilder('te')
      .innerJoin(TimesheetPeriod, 'tp', 'te.timesheet_id = tp.id')
      .innerJoin(Employee, 'employee', 'tp.employee_id = employee.id')
      .leftJoin(
        (subQuery) =>
          subQuery
            .from(Contract, 'c')
            .select(['c.employee_id as employee_id', 'c.monthly_cost as monthly_cost'])
            .where('c.status = :status', { status: ContractStatus.ACTIVE }),
        'contract',
        'contract.employee_id = employee.id',
      )
      .where('te.project_id = :projectId', { projectId })
      .select([
        'project.hourly_rate as project_hourly_rate',
        'SUM(te.worked_hours) as total_hours',
        'SUM(te.worked_hours * COALESCE(project.hourly_rate, 0)) as revenue',
        'SUM(te.worked_hours * COALESCE(contract.monthly_cost / :workingHours, 0)) as cost',
      ])
      .setParameter('workingHours', WORKING_HOURS_PER_MONTH)
      .groupBy('project.hourly_rate')
      .getRawOne<{
        project_hourly_rate: number | null;
        total_hours: number;
        revenue: number;
        cost: number;
      }>();

    if (!entries || entries.total_hours === 0) {
      return {
        projectId,
        projectName: project.name,
        revenue: 0,
        cost: 0,
        margin: 0,
      };
    }

    const revenue = entries.revenue;
    const cost = entries.cost;

    return {
      projectId,
      projectName: project.name,
      revenue,
      cost,
      margin: revenue - cost,
    };
  }

  @CacheResult(300)
  async getMonthlyRevenue(year: number): Promise<MonthlyRevenueDto[]> {
    const entries = await this.dataSource
      .getRepository(TimesheetEntry)
      .createQueryBuilder('te')
      .innerJoin(TimesheetPeriod, 'tp', 'te.timesheet_id = tp.id')
      .innerJoin(Project, 'project', 'te.project_id = project.id')
      .where('tp.period_year = :year', { year })
      .andWhere('te.project_id IS NOT NULL')
      .select([
        "CONCAT(tp.period_year, '-', LPAD(tp.period_month::text, 2, '0')) as month",
        'project.id as project_id',
        'project.name as project_name',
        'project.client_id as client_id',
        'SUM(te.worked_hours * COALESCE(project.hourly_rate, 0)) as revenue',
      ])
      .groupBy('month, project.id, project.name, project.client_id')
      .orderBy('month, project.name')
      .getRawMany<{
        month: string;
        project_id: string;
        project_name: string;
        client_id: string;
        revenue: number;
      }>();

    return entries.map((entry) => ({
      month: entry.month,
      projectId: entry.project_id,
      projectName: entry.project_name,
      clientId: entry.client_id,
      revenue: entry.revenue,
    }));
  }

  @CacheResult(300)
  async getTopPerformingProjects(limit = 10): Promise<TopPerformingProjectDto[]> {
    const projects = await this.projectRepository.find({
      where: { status: ProjectStatus.ACTIVE },
    });

    const results: TopPerformingProjectDto[] = [];

    for (const project of projects) {
      const profitability = await this.getProjectProfitability(project.id);

      if (profitability) {
        results.push({
          projectId: project.id,
          projectName: project.name,
          margin: profitability.margin,
          revenue: profitability.revenue,
          cost: profitability.cost,
        });
      }
    }

    return results.sort((a, b) => b.margin - a.margin).slice(0, limit);
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
