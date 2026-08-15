import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsService } from '../analytics/services/analytics.service';
import { TeamsService } from '../teams/services/teams.service';
import { TeamOccupancyDto, ProjectProfitabilityDto } from '../analytics/dto/analytics-response.dto';
import { Employee, EmployeeStatus } from '../users/entities/employee.entity';
import { ProjectAllocation } from '../projects/entities/project-allocation.entity';
import { AbsenceRequest } from '../absences/entities/absence-request.entity';
import { AbsenceStatus } from '../absences/entities/absence-status.enum';
import { AdminService } from '../admin/admin.service';
import {
  CapacityOverviewEntryDto,
  CapacityAlertsDto,
  CapacityCalendarEntryDto,
} from './dto/capacity-response.dto';

@Injectable()
export class CapacityService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(ProjectAllocation)
    private readonly allocationRepository: Repository<ProjectAllocation>,
    @InjectRepository(AbsenceRequest)
    private readonly absenceRepository: Repository<AbsenceRequest>,
    private readonly analyticsService: AnalyticsService,
    private readonly teamsService: TeamsService,
    private readonly adminService: AdminService,
  ) {}

  async getOverview(
    period: string,
    teamId?: string,
    employeeId?: string,
  ): Promise<CapacityOverviewEntryDto[]> {
    let base: TeamOccupancyDto[];

    if (employeeId) {
      const single = await this.analyticsService.getEmployeeOccupancy(employeeId, period);
      base = single ? [single] : [];
    } else if (teamId) {
      base = await this.analyticsService.getTeamOccupancy(teamId, period);
    } else {
      const activeEmployees = await this.employeeRepository.find({
        where: { status: EmployeeStatus.ACTIVE },
      });
      base = [];
      for (const employee of activeEmployees) {
        const occupancy = await this.analyticsService.getEmployeeOccupancy(employee.id, period);
        if (occupancy) {
          base.push(occupancy);
        }
      }
    }

    return this.applyAbsenceAdjustment(base, period);
  }

  async getAlerts(period: string, teamId?: string): Promise<CapacityAlertsDto> {
    const overview = await this.getOverview(period, teamId);
    const settings = await this.adminService.getSettings();

    const overallocations = overview.filter((entry) => entry.adjustedAllocationPercentage > 100);
    const underallocations = overview.filter(
      (entry) =>
        entry.adjustedAllocationPercentage > 0 &&
        entry.adjustedAllocationPercentage < settings.underallocationThresholdPercentage,
    );
    const available = overview
      .filter((entry) => entry.adjustedAllocationPercentage === 0)
      .map((entry) => ({ employeeId: entry.employeeId, employeeName: entry.employeeName }));

    return { overallocations, underallocations, available };
  }

  async getCalendar(
    period: string,
    teamId?: string,
    employeeId?: string,
  ): Promise<CapacityCalendarEntryDto[]> {
    const [year, monthNum] = period.split('-').map(Number);
    const startDate = this.firstDayOfMonth(year, monthNum);
    const endDate = this.lastDayOfMonth(year, monthNum);

    const query = this.allocationRepository
      .createQueryBuilder('pa')
      .innerJoinAndSelect('pa.project', 'project')
      .innerJoinAndSelect('pa.employee', 'employee')
      .where('pa.start_date <= :endDate', { endDate })
      .andWhere('(pa.end_date IS NULL OR pa.end_date >= :startDate)', { startDate });

    if (employeeId) {
      query.andWhere('pa.employee_id = :employeeId', { employeeId });
    }

    if (teamId) {
      const members = await this.teamsService.getMembers(teamId);
      const memberIds = members.map((member) => member.employeeId);
      if (memberIds.length === 0) {
        return [];
      }
      query.andWhere('pa.employee_id IN (:...memberIds)', { memberIds });
    }

    const allocations = await query.orderBy('pa.start_date', 'ASC').getMany();

    return allocations.map((allocation) => ({
      employeeId: allocation.employeeId,
      employeeName: allocation.employee.firstName + ' ' + allocation.employee.lastName,
      projectId: allocation.projectId,
      projectName: allocation.project.name,
      startDate: allocation.startDate,
      endDate: allocation.endDate,
      allocationType: allocation.allocationType,
      allocationValue: allocation.allocationValue,
    }));
  }

  async getProjectProfitability(projectId: string): Promise<ProjectProfitabilityDto | null> {
    return this.analyticsService.getProjectProfitability(projectId);
  }

  private async applyAbsenceAdjustment(
    base: TeamOccupancyDto[],
    period: string,
  ): Promise<CapacityOverviewEntryDto[]> {
    if (base.length === 0) {
      return [];
    }

    const [year, monthNum] = period.split('-').map(Number);
    const startDate = this.firstDayOfMonth(year, monthNum);
    const endDate = this.lastDayOfMonth(year, monthNum);
    const periodDays = this.daysBetween(startDate, endDate) + 1;

    const employeeIds = base.map((entry) => entry.employeeId);

    const absences = await this.absenceRepository
      .createQueryBuilder('a')
      .where('a.employee_id IN (:...employeeIds)', { employeeIds })
      .andWhere('a.status = :status', { status: AbsenceStatus.APPROVED })
      .andWhere('a.start_date <= :endDate', { endDate })
      .andWhere('a.end_date >= :startDate', { startDate })
      .getMany();

    const absenceDaysMap = new Map<string, number>();
    for (const absence of absences) {
      const overlapStart = absence.startDate > startDate ? absence.startDate : startDate;
      const overlapEnd = absence.endDate < endDate ? absence.endDate : endDate;
      const overlapDays = this.daysBetween(overlapStart, overlapEnd) + 1;
      const current = absenceDaysMap.get(absence.employeeId) ?? 0;
      absenceDaysMap.set(absence.employeeId, current + overlapDays);
    }

    return base.map((entry) => {
      const absenceDays = Math.min(absenceDaysMap.get(entry.employeeId) ?? 0, periodDays);
      const availabilityFactor = (periodDays - absenceDays) / periodDays;
      const adjustedAllocationPercentage =
        availabilityFactor > 0
          ? Math.round((entry.allocationPercentage / availabilityFactor) * 100) / 100
          : entry.allocationPercentage;

      return {
        employeeId: entry.employeeId,
        employeeName: entry.employeeName,
        allocationPercentage: entry.allocationPercentage,
        absenceDays,
        adjustedAllocationPercentage,
      };
    });
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
