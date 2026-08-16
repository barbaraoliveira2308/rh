import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AbsenceType } from '../entities/absence-type.entity';
import { AbsenceRequest } from '../entities/absence-request.entity';
import { AbsenceApproval } from '../entities/absence-approval.entity';
import { LeaveBalance } from '../entities/leave-balance.entity';
import { AbsenceStatus } from '../entities/absence-status.enum';
import { CreateAbsenceDto } from '../dto/create-absence.dto';
import { AbsenceRequestedEvent } from '../events/absence-requested.event';
import { AbsenceApprovedEvent } from '../events/absence-approved.event';
import { AbsenceRejectedEvent } from '../events/absence-rejected.event';
import { AbsenceCancelledEvent } from '../events/absence-cancelled.event';
import { Employee, EmployeeStatus } from '../../users/entities/employee.entity';
import { HolidayCalendar } from '../../timesheets/entities/holiday-calendar.entity';
import { CalendarService } from '../../calendar/services/calendar.service';
import { RbacService } from '../../rbac/services/rbac.service';
import { AdminService } from '../../admin/admin.service';

const VACATION_TYPE_CODE = 'VACATION';

@Injectable()
export class AbsencesService {
  constructor(
    @InjectRepository(AbsenceType)
    private readonly typeRepository: Repository<AbsenceType>,
    @InjectRepository(AbsenceRequest)
    private readonly requestRepository: Repository<AbsenceRequest>,
    @InjectRepository(AbsenceApproval)
    private readonly approvalRepository: Repository<AbsenceApproval>,
    @InjectRepository(LeaveBalance)
    private readonly balanceRepository: Repository<LeaveBalance>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(HolidayCalendar)
    private readonly holidayRepository: Repository<HolidayCalendar>,
    private readonly eventEmitter: EventEmitter2,
    private readonly calendarService: CalendarService,
    private readonly rbacService: RbacService,
    private readonly adminService: AdminService,
  ) {}

  async findTypes(): Promise<AbsenceType[]> {
    return this.typeRepository.find({ where: { isActive: true }, order: { name: 'ASC' } });
  }

  async create(dto: CreateAbsenceDto, employeeId: string): Promise<AbsenceRequest> {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException('Colaborador não encontrado');
    }

    if (employee.status !== EmployeeStatus.ACTIVE) {
      throw new BadRequestException('Colaborador inativo não pode submeter pedidos');
    }

    const absenceType = await this.typeRepository.findOne({
      where: { id: dto.absenceTypeId, isActive: true },
    });

    if (!absenceType) {
      throw new NotFoundException('Tipo de ausência não encontrado ou inativo');
    }

    if (absenceType.requiresDocument) {
      throw new BadRequestException(
        'Este tipo de ausência exige documento justificativo. Use o endpoint de upload.',
      );
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate < startDate) {
      throw new BadRequestException('Data de fim não pode ser anterior à data de início');
    }

    this.validateBlockedPeriods(absenceType, startDate, endDate);

    await this.calendarService.validateBlockedPeriodForAbsences(dto.startDate, dto.endDate);

    const overlapping = await this.requestRepository.findOne({
      where: {
        employeeId,
        status: AbsenceStatus.PENDING,
        startDate: LessThanOrEqual(dto.endDate),
        endDate: MoreThanOrEqual(dto.startDate),
      },
    });

    if (overlapping) {
      throw new BadRequestException('Já existe um pedido de ausência neste período');
    }

    const approvedOverlap = await this.requestRepository.findOne({
      where: {
        employeeId,
        status: AbsenceStatus.APPROVED,
        startDate: LessThanOrEqual(dto.endDate),
        endDate: MoreThanOrEqual(dto.startDate),
      },
    });

    if (approvedOverlap) {
      throw new BadRequestException('Já existe uma ausência aprovada neste período');
    }

    const totalDays = await this.calculateBusinessDays(dto.startDate, dto.endDate);

    if (absenceType.affectsBalance) {
      let balance = await this.balanceRepository.findOne({
        where: {
          employeeId,
          absenceTypeId: dto.absenceTypeId,
          year: startDate.getFullYear(),
        },
      });

      if (!balance && absenceType.code === VACATION_TYPE_CODE) {
        balance = await this.ensureVacationBalance(employeeId, startDate.getFullYear());
      }

      if (balance) {
        const available = balance.remainingDays - balance.pendingDays;

        if (totalDays > available) {
          throw new BadRequestException(
            'Saldo insuficiente. Disponível: ' +
              String(available) +
              ' dias, solicitado: ' +
              String(totalDays) +
              ' dias.',
          );
        }
      }
    }

    const request = this.requestRepository.create({
      employeeId,
      absenceTypeId: dto.absenceTypeId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      startHalf: dto.startHalf ?? false,
      endHalf: dto.endHalf ?? false,
      totalDays,
      totalHours: totalDays * 8,
      status: AbsenceStatus.PENDING,
      reason: dto.reason ?? null,
    });

    const saved = await this.requestRepository.save(request);

    if (absenceType.affectsBalance) {
      const balance = await this.balanceRepository.findOne({
        where: {
          employeeId,
          absenceTypeId: dto.absenceTypeId,
          year: startDate.getFullYear(),
        },
      });

      if (balance) {
        await this.balanceRepository.update(balance.id, {
          pendingDays: balance.pendingDays + totalDays,
        });
      }
    }

    this.eventEmitter.emit(
      'absence.requested',
      new AbsenceRequestedEvent(saved.id, employeeId, dto.absenceTypeId),
    );

    return saved;
  }

  private validateBlockedPeriods(absenceType: AbsenceType, startDate: Date, endDate: Date): void {
    if (!absenceType.blockedPeriods) return;

    try {
      const periods = JSON.parse(absenceType.blockedPeriods) as { start: string; end: string }[];

      for (const period of periods) {
        const blockStart = new Date(period.start);
        const blockEnd = new Date(period.end);

        if (startDate <= blockEnd && endDate >= blockStart) {
          throw new BadRequestException('Período bloqueado: ' + period.start + ' a ' + period.end);
        }
      }
    } catch {
      // not a valid JSON, skip validation
    }
  }

  async calculateBusinessDays(startDate: string, endDate: string): Promise<number> {
    const holidays = await this.holidayRepository.find();
    const holidayDates = new Set(holidays.map((h) => h.holidayDate));

    const start = new Date(startDate);
    const end = new Date(endDate);
    let count = 0;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();

      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      const dateStr =
        String(d.getFullYear()) +
        '-' +
        String(d.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(d.getDate()).padStart(2, '0');

      if (holidayDates.has(dateStr)) continue;

      count++;
    }

    return count;
  }

  async findAll(filters?: {
    employeeId?: string;
    type?: string;
    status?: AbsenceStatus;
    year?: number;
  }): Promise<AbsenceRequest[]> {
    const where: Record<string, unknown> = {};

    if (filters?.employeeId) where.employeeId = filters.employeeId;
    if (filters?.type) where.absenceTypeId = filters.type;
    if (filters?.status) where.status = filters.status;

    return this.requestRepository.find({
      where,
      relations: ['absenceType', 'employee'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<AbsenceRequest> {
    const request = await this.requestRepository.findOne({
      where: { id },
      relations: ['absenceType', 'employee'],
    });

    if (!request) {
      throw new NotFoundException('Pedido de ausência não encontrado');
    }

    return request;
  }

  async approve(absenceId: string, approverId: string): Promise<AbsenceRequest> {
    const request = await this.requestRepository.findOne({
      where: { id: absenceId },
      relations: ['absenceType'],
    });

    if (!request) {
      throw new NotFoundException('Pedido de ausência não encontrado');
    }

    if (request.status !== AbsenceStatus.PENDING) {
      throw new BadRequestException('Apenas pedidos pendentes podem ser aprovados');
    }

    await this.validateApprover(request.employeeId, approverId);

    request.status = AbsenceStatus.APPROVED;
    const saved = await this.requestRepository.save(request);

    const approval = this.approvalRepository.create({
      absenceId,
      approverId,
      decision: 'approved',
    });

    await this.approvalRepository.save(approval);

    const startYear = new Date(request.startDate).getFullYear();

    if (request.absenceType.affectsBalance) {
      const balance = await this.balanceRepository.findOne({
        where: {
          employeeId: request.employeeId,
          absenceTypeId: request.absenceTypeId,
          year: startYear,
        },
      });

      if (balance) {
        await this.balanceRepository.update(balance.id, {
          usedDays: balance.usedDays + request.totalDays,
          pendingDays: Math.max(0, balance.pendingDays - request.totalDays),
          remainingDays: balance.remainingDays - request.totalDays,
        });
      }
    }

    this.eventEmitter.emit(
      'absence.approved',
      new AbsenceApprovedEvent(absenceId, request.employeeId, approverId),
    );

    return saved;
  }

  async reject(absenceId: string, approverId: string, reason: string): Promise<AbsenceRequest> {
    const request = await this.requestRepository.findOne({
      where: { id: absenceId },
    });

    if (!request) {
      throw new NotFoundException('Pedido de ausência não encontrado');
    }

    if (request.status !== AbsenceStatus.PENDING) {
      throw new BadRequestException('Apenas pedidos pendentes podem ser rejeitados');
    }

    await this.validateApprover(request.employeeId, approverId);

    const startYear = new Date(request.startDate).getFullYear();

    const balance = await this.balanceRepository.findOne({
      where: {
        employeeId: request.employeeId,
        absenceTypeId: request.absenceTypeId,
        year: startYear,
      },
    });

    if (balance) {
      await this.balanceRepository.update(balance.id, {
        pendingDays: Math.max(0, balance.pendingDays - request.totalDays),
      });
    }

    request.status = AbsenceStatus.REJECTED;
    request.rejectionReason = reason;
    const saved = await this.requestRepository.save(request);

    const approval = this.approvalRepository.create({
      absenceId,
      approverId,
      decision: 'rejected',
      comments: reason,
    });

    await this.approvalRepository.save(approval);

    this.eventEmitter.emit(
      'absence.rejected',
      new AbsenceRejectedEvent(absenceId, request.employeeId, approverId, reason),
    );

    return saved;
  }

  async cancel(absenceId: string, employeeId: string): Promise<AbsenceRequest> {
    const request = await this.requestRepository.findOne({
      where: { id: absenceId },
    });

    if (!request) {
      throw new NotFoundException('Pedido de ausência não encontrado');
    }

    if (request.employeeId !== employeeId) {
      throw new ForbiddenException('Apenas o próprio pode cancelar o pedido');
    }

    if (request.status === AbsenceStatus.APPROVED) {
      const today = new Date().toISOString().split('T')[0];
      if (request.startDate <= today) {
        throw new BadRequestException(
          'Apenas é possível cancelar ausências aprovadas antes da data de início',
        );
      }
    }

    if (request.status !== AbsenceStatus.PENDING && request.status !== AbsenceStatus.APPROVED) {
      throw new BadRequestException('Apenas pedidos pendentes ou aprovados podem ser cancelados');
    }

    const startYear = new Date(request.startDate).getFullYear();

    const balance = await this.balanceRepository.findOne({
      where: {
        employeeId: request.employeeId,
        absenceTypeId: request.absenceTypeId,
        year: startYear,
      },
    });

    if (balance) {
      const updates: Record<string, number> = {};

      if (request.status === AbsenceStatus.APPROVED) {
        updates.usedDays = Math.max(0, balance.usedDays - request.totalDays);
        updates.remainingDays = balance.remainingDays + request.totalDays;
      } else {
        updates.pendingDays = Math.max(0, balance.pendingDays - request.totalDays);
      }

      await this.balanceRepository.update(balance.id, updates);
    }

    request.status = AbsenceStatus.CANCELLED;
    const saved = await this.requestRepository.save(request);

    this.eventEmitter.emit('absence.cancelled', new AbsenceCancelledEvent(absenceId, employeeId));

    return saved;
  }

  async updateDocument(id: string, documentUrl: string): Promise<AbsenceRequest> {
    const request = await this.findOne(id);

    if (request.status !== AbsenceStatus.PENDING) {
      throw new BadRequestException('Apenas pedidos pendentes podem ser alterados');
    }

    request.documentUrl = documentUrl;
    return this.requestRepository.save(request);
  }

  async getLeaveBalance(employeeId: string, year: number): Promise<LeaveBalance[]> {
    return this.balanceRepository.find({
      where: { employeeId, year },
      relations: ['absenceType'],
      order: { absenceTypeId: 'ASC' },
    });
  }

  async recalculateBalance(employeeId: string, year: number): Promise<LeaveBalance[]> {
    const balances = await this.balanceRepository.find({
      where: { employeeId, year },
      relations: ['absenceType'],
    });

    const approved = await this.requestRepository.find({
      where: {
        employeeId,
        status: AbsenceStatus.APPROVED,
      },
    });

    const pending = await this.requestRepository.find({
      where: {
        employeeId,
        status: AbsenceStatus.PENDING,
      },
    });

    const updatedBalances: LeaveBalance[] = [];

    for (const balance of balances) {
      if (!balance.absenceType.affectsBalance) continue;

      const used = approved
        .filter((a) => a.absenceTypeId === balance.absenceTypeId)
        .reduce((sum, a) => sum + a.totalDays, 0);

      const pend = pending
        .filter((a) => a.absenceTypeId === balance.absenceTypeId)
        .reduce((sum, a) => sum + a.totalDays, 0);

      const remaining = balance.entitledDays + balance.carryOverDays - used;

      await this.balanceRepository.update(balance.id, {
        usedDays: used,
        pendingDays: pend,
        remainingDays: remaining,
      });

      const updated = await this.balanceRepository.findOne({
        where: { id: balance.id },
        relations: ['absenceType'],
      });

      if (updated) updatedBalances.push(updated);
    }

    return updatedBalances;
  }

  private async validateApprover(employeeId: string, approverId: string): Promise<void> {
    const approver = await this.employeeRepository.findOne({
      where: { id: approverId },
    });

    if (!approver) {
      throw new NotFoundException('Aprovador não encontrado');
    }

    if (approver.status !== EmployeeStatus.ACTIVE) {
      throw new BadRequestException('Aprovador não está ativo');
    }

    if (await this.rbacService.isAdmin(approver.userId)) return;

    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException('Colaborador não encontrado');
    }

    if (employee.managerId !== approverId) {
      throw new ForbiddenException('Apenas o manager direto ou admin pode aprovar/rejeitar');
    }
  }

  @Cron('0 7 1 1 *')
  async generateAnnualLeaveBalances(): Promise<number> {
    const year = new Date().getFullYear();

    const vacationType = await this.typeRepository.findOne({
      where: { code: VACATION_TYPE_CODE },
    });

    if (!vacationType) return 0;

    const employees = await this.employeeRepository.find({
      where: { status: EmployeeStatus.ACTIVE },
    });

    let createdCount = 0;

    for (const employee of employees) {
      const existing = await this.balanceRepository.findOne({
        where: { employeeId: employee.id, absenceTypeId: vacationType.id, year },
      });

      if (existing) continue;

      const created = await this.createVacationBalanceForEmployee(employee, vacationType, year);
      if (created) createdCount++;
    }

    return createdCount;
  }

  private async ensureVacationBalance(
    employeeId: string,
    year: number,
  ): Promise<LeaveBalance | null> {
    const vacationType = await this.typeRepository.findOne({
      where: { code: VACATION_TYPE_CODE },
    });

    if (!vacationType) return null;

    const existing = await this.balanceRepository.findOne({
      where: { employeeId, absenceTypeId: vacationType.id, year },
    });

    if (existing) return existing;

    const employee = await this.employeeRepository.findOne({ where: { id: employeeId } });
    if (!employee) return null;

    return this.createVacationBalanceForEmployee(employee, vacationType, year);
  }

  private async createVacationBalanceForEmployee(
    employee: Employee,
    vacationType: AbsenceType,
    year: number,
  ): Promise<LeaveBalance | null> {
    const settings = await this.adminService.getSettings();
    const legalEntity = await this.adminService.getEffectiveLegalEntity(employee.id);
    const vacationDaysPerYear =
      legalEntity?.vacationDaysPerYearOverride ?? settings.defaultVacationDaysPerYear;

    const entitledDays = this.computeEntitledVacationDays(
      employee.employmentStartDate,
      year,
      vacationDaysPerYear,
    );

    if (entitledDays <= 0) return null;

    const carryOverDays = await this.computeCarryOverDays(
      employee.id,
      vacationType.id,
      year,
      settings.carryOverVacationDays,
    );

    const balance = this.balanceRepository.create({
      employeeId: employee.id,
      absenceTypeId: vacationType.id,
      year,
      entitledDays,
      carryOverDays,
      remainingDays: entitledDays + carryOverDays,
    });

    return this.balanceRepository.save(balance);
  }

  private computeEntitledVacationDays(
    employmentStartDate: string,
    year: number,
    defaultDaysPerYear: number,
  ): number {
    const [startYearStr, startMonthStr] = employmentStartDate.split('-');
    const startYear = Number(startYearStr);
    const startMonth = Number(startMonthStr);

    if (startYear < year) return defaultDaysPerYear;
    if (startYear > year) return 0;

    const remainingMonths = 13 - startMonth;

    return Math.round((defaultDaysPerYear * remainingMonths) / 12);
  }

  private async computeCarryOverDays(
    employeeId: string,
    absenceTypeId: string,
    year: number,
    carryOverCap: number,
  ): Promise<number> {
    const previousYearBalance = await this.balanceRepository.findOne({
      where: { employeeId, absenceTypeId, year: year - 1 },
    });

    if (!previousYearBalance) return 0;

    return Math.min(carryOverCap, Math.max(0, previousYearBalance.remainingDays));
  }
}
