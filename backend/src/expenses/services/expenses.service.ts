import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, Between } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as ExcelJS from 'exceljs';
import { ExpenseReport } from '../entities/expense-report.entity';
import { ExpenseItem } from '../entities/expense-item.entity';
import { ExpenseCategory } from '../entities/expense-category.entity';
import { ExpenseApproval } from '../entities/expense-approval.entity';
import { ExpenseReportStatus } from '../entities/expense-report-status.enum';
import { CreateExpenseReportDto } from '../dto/create-expense-report.dto';
import { CreateExpenseItemDto } from '../dto/create-expense-item.dto';
import { ExpenseSubmittedEvent } from '../events/expense-submitted.event';
import { ExpenseApprovedEvent } from '../events/expense-approved.event';
import { ExpenseRejectedEvent } from '../events/expense-rejected.event';
import { ExpenseSentForPaymentEvent } from '../events/expense-sent-for-payment.event';
import { ExpensePaidEvent } from '../events/expense-paid.event';
import { Employee, EmployeeStatus } from '../../users/entities/employee.entity';
import { RbacService } from '../../rbac/services/rbac.service';
import { AdminService } from '../../admin/admin.service';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(ExpenseReport)
    private readonly reportRepository: Repository<ExpenseReport>,
    @InjectRepository(ExpenseItem)
    private readonly itemRepository: Repository<ExpenseItem>,
    @InjectRepository(ExpenseCategory)
    private readonly categoryRepository: Repository<ExpenseCategory>,
    @InjectRepository(ExpenseApproval)
    private readonly approvalRepository: Repository<ExpenseApproval>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    private readonly eventEmitter: EventEmitter2,
    private readonly rbacService: RbacService,
    private readonly adminService: AdminService,
  ) {}

  async createReport(employeeId: string, dto: CreateExpenseReportDto): Promise<ExpenseReport> {
    const employee = await this.employeeRepository.findOne({ where: { id: employeeId } });

    if (!employee) {
      throw new NotFoundException('Colaborador não encontrado');
    }

    if (employee.status !== EmployeeStatus.ACTIVE) {
      throw new BadRequestException('Colaborador inativo não pode submeter despesas');
    }

    if (dto.periodEnd < dto.periodStart) {
      throw new BadRequestException('Data de fim não pode ser anterior à data de início');
    }

    const settings = await this.adminService.getSettings();
    const legalEntity = await this.adminService.getEffectiveLegalEntity(employeeId);
    const defaultCurrency = legalEntity?.currency ?? settings.defaultCurrency;

    const report = this.reportRepository.create({
      employeeId,
      title: dto.title,
      periodStart: dto.periodStart,
      periodEnd: dto.periodEnd,
      status: ExpenseReportStatus.DRAFT,
      totalAmount: 0,
      currency: dto.items?.[0]?.currency ?? defaultCurrency,
      projectId: dto.projectId ?? null,
      notes: dto.notes ?? null,
    });

    const saved = await this.reportRepository.save(report);

    if (dto.items && dto.items.length > 0) {
      for (const itemDto of dto.items) {
        await this.addItem(saved.id, itemDto, false);
      }

      await this.recalculateTotal(saved.id);
    }

    return this.findOne(saved.id);
  }

  async addItem(
    reportId: string,
    itemDto: CreateExpenseItemDto,
    recalculate = true,
  ): Promise<ExpenseItem> {
    const report = await this.reportRepository.findOne({
      where: { id: reportId },
      relations: ['items'],
    });

    if (!report) {
      throw new NotFoundException('Relatório de despesas não encontrado');
    }

    if (report.status !== ExpenseReportStatus.DRAFT) {
      throw new BadRequestException('Apenas relatórios em rascunho podem ser editados');
    }

    const category = await this.categoryRepository.findOne({
      where: { id: itemDto.categoryId, isActive: true },
    });

    if (!category) {
      throw new NotFoundException('Categoria de despesa não encontrada ou inativa');
    }

    const settings = await this.adminService.getSettings();
    const legalEntity = await this.adminService.getEffectiveLegalEntity(report.employeeId);
    const defaultCurrency = legalEntity?.currency ?? settings.defaultCurrency;

    const item = this.itemRepository.create({
      reportId,
      categoryId: itemDto.categoryId,
      description: itemDto.description,
      amount: itemDto.amount,
      currency: itemDto.currency ?? defaultCurrency,
      expenseDate: itemDto.expenseDate,
      receiptUrl: itemDto.receiptUrl ?? null,
      isDuplicate: false,
    });

    const saved = await this.itemRepository.save(item);

    if (recalculate) {
      await this.recalculateTotal(reportId);
    }

    return saved;
  }

  async submit(reportId: string): Promise<ExpenseReport> {
    const report = await this.reportRepository.findOne({
      where: { id: reportId },
      relations: ['items', 'items.category'],
    });

    if (!report) {
      throw new NotFoundException('Relatório de despesas não encontrado');
    }

    if (report.status !== ExpenseReportStatus.DRAFT) {
      throw new BadRequestException('Apenas relatórios em rascunho podem ser submetidos');
    }

    if (report.items.length === 0) {
      throw new BadRequestException('O relatório deve conter pelo menos uma despesa');
    }

    for (const item of report.items) {
      if (item.category.requiresReceipt && !item.receiptUrl) {
        throw new BadRequestException(
          'A categoria ' +
            item.category.name +
            ' exige comprovativo para o item: ' +
            item.description,
        );
      }

      if (item.category.limitAmount !== null && item.amount > item.category.limitAmount) {
        throw new BadRequestException(
          'Item ' +
            item.description +
            ' excede o limite por relatório da categoria ' +
            item.category.name +
            '. Limite: ' +
            String(item.category.limitAmount) +
            ', valor: ' +
            String(item.amount),
        );
      }
    }

    const duplicateUpdates: ExpenseItem[] = [];

    for (const item of report.items) {
      const duplicates = await this.detectDuplicates(
        report.employeeId,
        item.amount,
        item.expenseDate,
        item.categoryId,
        reportId,
      );

      if (duplicates.length > 0) {
        item.isDuplicate = true;
        duplicateUpdates.push(item);
      }
    }

    if (duplicateUpdates.length > 0) {
      await this.itemRepository.save(duplicateUpdates);
    }

    report.status = ExpenseReportStatus.PENDING;
    report.submittedAt = new Date();

    const saved = await this.reportRepository.save(report);

    this.eventEmitter.emit(
      'expense.submitted',
      new ExpenseSubmittedEvent(saved.id, report.employeeId, saved.totalAmount),
    );

    return saved;
  }

  async approve(reportId: string, approverId: string, comment?: string): Promise<ExpenseReport> {
    const report = await this.reportRepository.findOne({
      where: { id: reportId },
      relations: ['items'],
    });

    if (!report) {
      throw new NotFoundException('Relatório de despesas não encontrado');
    }

    if (report.status !== ExpenseReportStatus.PENDING) {
      throw new BadRequestException('Apenas relatórios pendentes podem ser aprovados');
    }

    await this.validateApprover(report.employeeId, approverId);

    report.status = ExpenseReportStatus.APPROVED;
    report.approvedAt = new Date();
    report.approvedBy = approverId;

    const saved = await this.reportRepository.save(report);

    const approval = this.approvalRepository.create({
      reportId,
      approverId,
      decision: 'approved',
      comments: comment ?? null,
    });

    await this.approvalRepository.save(approval);

    this.eventEmitter.emit(
      'expense.approved',
      new ExpenseApprovedEvent(saved.id, report.employeeId, approverId),
    );

    return saved;
  }

  async reject(reportId: string, approverId: string, reason: string): Promise<ExpenseReport> {
    const report = await this.reportRepository.findOne({
      where: { id: reportId },
      relations: ['items'],
    });

    if (!report) {
      throw new NotFoundException('Relatório de despesas não encontrado');
    }

    if (report.status !== ExpenseReportStatus.PENDING) {
      throw new BadRequestException('Apenas relatórios pendentes podem ser rejeitados');
    }

    await this.validateApprover(report.employeeId, approverId);

    report.status = ExpenseReportStatus.REJECTED;
    report.rejectionReason = reason;

    const saved = await this.reportRepository.save(report);

    const approval = this.approvalRepository.create({
      reportId,
      approverId,
      decision: 'rejected',
      comments: reason,
    });

    await this.approvalRepository.save(approval);

    this.eventEmitter.emit(
      'expense.rejected',
      new ExpenseRejectedEvent(saved.id, report.employeeId, approverId, reason),
    );

    return saved;
  }

  async sendForPayment(reportId: string): Promise<ExpenseReport> {
    const report = await this.reportRepository.findOne({ where: { id: reportId } });

    if (!report) {
      throw new NotFoundException('Relatório de despesas não encontrado');
    }

    if (report.status !== ExpenseReportStatus.APPROVED) {
      throw new BadRequestException(
        'Apenas relatórios aprovados podem ser enviados para pagamento',
      );
    }

    report.status = ExpenseReportStatus.SENT_FOR_PAYMENT;

    const saved = await this.reportRepository.save(report);

    this.eventEmitter.emit(
      'expense.sent_for_payment',
      new ExpenseSentForPaymentEvent(saved.id, report.employeeId),
    );

    return saved;
  }

  async markPaid(reportId: string): Promise<ExpenseReport> {
    const report = await this.reportRepository.findOne({ where: { id: reportId } });

    if (!report) {
      throw new NotFoundException('Relatório de despesas não encontrado');
    }

    if (report.status !== ExpenseReportStatus.SENT_FOR_PAYMENT) {
      throw new BadRequestException(
        'Apenas relatórios enviados para pagamento podem ser marcados como pagos',
      );
    }

    report.status = ExpenseReportStatus.PAID;
    report.paidAt = new Date();

    const saved = await this.reportRepository.save(report);

    this.eventEmitter.emit('expense.paid', new ExpensePaidEvent(saved.id, report.employeeId));

    return saved;
  }

  async detectDuplicates(
    employeeId: string,
    amount: number,
    date: string,
    categoryId: string,
    excludeReportId?: string,
  ): Promise<ExpenseReport[]> {
    const targetDate = new Date(date);
    const startDate = new Date(targetDate);
    startDate.setDate(startDate.getDate() - 30);

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = targetDate.toISOString().split('T')[0];

    const reports = await this.reportRepository.find({
      where: {
        employeeId,
        status: ExpenseReportStatus.PENDING,
        submittedAt: MoreThanOrEqual(new Date(startStr + 'T00:00:00.000Z')),
      },
      relations: ['items', 'items.category'],
    });

    const lowerBound = amount * 0.95;
    const upperBound = amount * 1.05;

    const result: ExpenseReport[] = [];

    for (const report of reports) {
      if (excludeReportId && report.id === excludeReportId) {
        continue;
      }

      const hasDuplicate = report.items.some((item) => {
        return (
          item.categoryId === categoryId &&
          item.expenseDate >= startStr &&
          item.expenseDate <= endStr &&
          item.amount >= lowerBound &&
          item.amount <= upperBound
        );
      });

      if (hasDuplicate) {
        result.push(report);
      }
    }

    return result;
  }

  async exportToExcel(filters?: {
    employeeId?: string;
    status?: ExpenseReportStatus;
    month?: string;
  }): Promise<Buffer> {
    const reports = await this.findAll(filters);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Despesas');

    worksheet.columns = [
      { header: 'ID Relatório', key: 'reportId', width: 36 },
      { header: 'Colaborador ID', key: 'employeeId', width: 36 },
      { header: 'Título', key: 'title', width: 30 },
      { header: 'Período Início', key: 'periodStart', width: 15 },
      { header: 'Período Fim', key: 'periodEnd', width: 15 },
      { header: 'Estado', key: 'status', width: 15 },
      { header: 'Total', key: 'totalAmount', width: 12 },
      { header: 'Moeda', key: 'currency', width: 8 },
      { header: 'Submetido em', key: 'submittedAt', width: 20 },
      { header: 'Item ID', key: 'itemId', width: 36 },
      { header: 'Categoria', key: 'category', width: 25 },
      { header: 'Descrição', key: 'description', width: 30 },
      { header: 'Valor Item', key: 'itemAmount', width: 12 },
      { header: 'Data Despesa', key: 'expenseDate', width: 15 },
      { header: 'Recibo', key: 'receiptUrl', width: 40 },
      { header: 'Duplicado', key: 'isDuplicate', width: 12 },
    ];

    for (const report of reports) {
      for (const item of report.items) {
        worksheet.addRow({
          reportId: report.id,
          employeeId: report.employeeId,
          title: report.title,
          periodStart: report.periodStart,
          periodEnd: report.periodEnd,
          status: report.status,
          totalAmount: report.totalAmount,
          currency: report.currency,
          submittedAt: report.submittedAt ? report.submittedAt.toISOString() : '',
          itemId: item.id,
          category: item.category.name,
          description: item.description,
          itemAmount: item.amount,
          expenseDate: item.expenseDate,
          receiptUrl: item.receiptUrl ?? '',
          isDuplicate: item.isDuplicate ? 'Sim' : 'Não',
        });
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async findAll(filters?: {
    employeeId?: string;
    status?: ExpenseReportStatus;
    month?: string;
  }): Promise<ExpenseReport[]> {
    const where: Record<string, unknown> = {};

    if (filters?.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.month) {
      const [year, month] = filters.month.split('-').map(Number);
      where.periodStart = Between(filters.month + '-01', this.lastDayOfMonth(year, month));
    }

    return this.reportRepository.find({
      where,
      relations: ['items', 'items.category', 'employee'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<ExpenseReport> {
    const report = await this.reportRepository.findOne({
      where: { id },
      relations: ['items', 'items.category', 'employee'],
    });

    if (!report) {
      throw new NotFoundException('Relatório de despesas não encontrado');
    }

    return report;
  }

  async findCategories(): Promise<ExpenseCategory[]> {
    return this.categoryRepository.find({ where: { isActive: true }, order: { name: 'ASC' } });
  }

  async createCategory(dto: {
    name: string;
    code: string;
    limitAmount?: number;
    requiresReceipt?: boolean;
  }): Promise<ExpenseCategory> {
    const existing = await this.categoryRepository.findOne({ where: { code: dto.code } });

    if (existing) {
      throw new BadRequestException('Já existe uma categoria com o código ' + dto.code);
    }

    const category = this.categoryRepository.create({
      name: dto.name,
      code: dto.code,
      limitAmount: dto.limitAmount ?? null,
      requiresReceipt: dto.requiresReceipt ?? true,
    });

    return this.categoryRepository.save(category);
  }

  private async recalculateTotal(reportId: string): Promise<void> {
    const items = await this.itemRepository.find({ where: { reportId } });
    const total = items.reduce((sum, item) => sum + item.amount, 0);

    await this.reportRepository.update(reportId, { totalAmount: total });
  }

  private async validateApprover(employeeId: string, approverId: string): Promise<void> {
    const approver = await this.employeeRepository.findOne({ where: { id: approverId } });

    if (!approver) {
      throw new NotFoundException('Aprovador não encontrado');
    }

    if (approver.status !== EmployeeStatus.ACTIVE) {
      throw new BadRequestException('Aprovador não está ativo');
    }

    if (await this.rbacService.isAdmin(approver.userId)) {
      return;
    }

    const employee = await this.employeeRepository.findOne({ where: { id: employeeId } });

    if (!employee) {
      throw new NotFoundException('Colaborador não encontrado');
    }

    if (employee.managerId !== approverId) {
      throw new ForbiddenException('Apenas o manager direto ou admin pode aprovar/rejeitar');
    }
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
}
