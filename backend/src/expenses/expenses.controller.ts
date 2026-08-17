import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ExpensesService } from './services/expenses.service';
import { ExpenseReport } from './entities/expense-report.entity';
import { ExpenseItem } from './entities/expense-item.entity';
import { ExpenseCategory } from './entities/expense-category.entity';
import { ExpenseReportStatus } from './entities/expense-report-status.enum';
import { CreateExpenseReportDto } from './dto/create-expense-report.dto';
import { CreateExpenseItemDto } from './dto/create-expense-item.dto';
import { ApproveExpenseDto } from './dto/approve-expense.dto';
import { RejectExpenseDto } from './dto/reject-expense.dto';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { Roles } from '../rbac/decorators/roles.decorator';
import { RoleEnum } from '../rbac/enums/role.enum';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { EmployeeIdentityService } from '../auth/services/employee-identity.service';
import { Audit } from '../audit/decorators';
import { AuditInterceptor } from '../audit/interceptors/audit.interceptor';

@Controller()
@ApiTags('Expenses')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@ApiBearerAuth()
export class ExpensesController {
  constructor(
    private readonly expensesService: ExpensesService,
    private readonly employeeIdentity: EmployeeIdentityService,
  ) {}

  @Get('expenses')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Listar relatórios de despesas (com filtros)' })
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Req() req: Request,
    @Query('employee_id') employeeId?: string,
    @Query('status') status?: ExpenseReportStatus,
    @Query('month') month?: string,
  ): Promise<ExpenseReport[]> {
    const user = req.user as JwtPayload;
    const isAdminOrManager =
      user.roles.includes(RoleEnum.ADMIN) || user.roles.includes(RoleEnum.MANAGER);

    let callerEmployeeId: string | undefined;

    if (!isAdminOrManager) {
      callerEmployeeId = await this.employeeIdentity.resolveEmployeeId(user.sub);

      if (employeeId && employeeId !== callerEmployeeId) {
        throw new ForbiddenException('Apenas pode ver as suas próprias despesas');
      }
    }

    return this.expensesService.findAll({
      employeeId: isAdminOrManager ? employeeId : callerEmployeeId,
      status,
      month,
    });
  }

  @Post('expenses')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Criar relatório de despesas' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateExpenseReportDto, @Req() req: Request): Promise<ExpenseReport> {
    const user = req.user as JwtPayload;
    const employeeId = await this.employeeIdentity.resolveEmployeeId(user.sub);
    return this.expensesService.createReport(employeeId, dto);
  }

  @Get('expenses/export')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Exportar despesas para Excel' })
  @HttpCode(HttpStatus.OK)
  async export(
    @Req() req: Request,
    @Res() res: Response,
    @Query('employee_id') employeeId?: string,
    @Query('status') status?: ExpenseReportStatus,
    @Query('month') month?: string,
  ): Promise<void> {
    const user = req.user as JwtPayload;
    const isAdminOrManager =
      user.roles.includes(RoleEnum.ADMIN) || user.roles.includes(RoleEnum.MANAGER);

    const callerEmployeeId = isAdminOrManager
      ? undefined
      : await this.employeeIdentity.resolveEmployeeId(user.sub);

    const buffer = await this.expensesService.exportToExcel({
      employeeId: isAdminOrManager ? employeeId : callerEmployeeId,
      status,
      month,
    });

    const timestamp = new Date().toISOString().split('T')[0];

    res.setHeader('Content-Disposition', 'attachment; filename="expenses-' + timestamp + '.xlsx"');
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.send(buffer);
  }

  @Get('expenses/categories')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Listar categorias de despesa' })
  @HttpCode(HttpStatus.OK)
  async findCategories(): Promise<ExpenseCategory[]> {
    return this.expensesService.findCategories();
  }

  @Post('expenses/categories')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Criar categoria de despesa' })
  @HttpCode(HttpStatus.CREATED)
  async createCategory(@Body() dto: CreateExpenseCategoryDto): Promise<ExpenseCategory> {
    return this.expensesService.createCategory(dto);
  }

  @Get('expenses/:id')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Obter relatório de despesas por ID' })
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string, @Req() req: Request): Promise<ExpenseReport> {
    const user = req.user as JwtPayload;
    const isAdminOrManager =
      user.roles.includes(RoleEnum.ADMIN) ||
      user.roles.includes(RoleEnum.MANAGER) ||
      user.roles.includes(RoleEnum.APPROVER);

    if (!isAdminOrManager) {
      const report = await this.expensesService.findOne(id);
      const callerEmployeeId = await this.employeeIdentity.resolveEmployeeId(user.sub);
      if (report.employeeId !== callerEmployeeId) {
        throw new ForbiddenException('Acesso negado a este relatório');
      }
    }

    return this.expensesService.findOne(id);
  }

  @Post('expenses/:id/items')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Adicionar item a relatório de despesas' })
  @HttpCode(HttpStatus.CREATED)
  async addItem(
    @Param('id') id: string,
    @Body() dto: CreateExpenseItemDto,
    @Req() req: Request,
  ): Promise<ExpenseItem> {
    const user = req.user as JwtPayload;
    const report = await this.expensesService.findOne(id);
    const callerEmployeeId = await this.employeeIdentity.resolveEmployeeId(user.sub);

    if (report.employeeId !== callerEmployeeId) {
      throw new ForbiddenException('Apenas o próprio pode editar o relatório');
    }

    return this.expensesService.addItem(id, dto);
  }

  @Post('expenses/:id/submit')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @Audit('Submitted', 'ExpenseReport')
  @ApiOperation({ summary: 'Submeter relatório de despesas' })
  @HttpCode(HttpStatus.OK)
  async submit(@Param('id') id: string, @Req() req: Request): Promise<ExpenseReport> {
    const user = req.user as JwtPayload;
    const report = await this.expensesService.findOne(id);
    const callerEmployeeId = await this.employeeIdentity.resolveEmployeeId(user.sub);

    if (report.employeeId !== callerEmployeeId) {
      throw new ForbiddenException('Apenas o próprio pode submeter o relatório');
    }

    return this.expensesService.submit(id);
  }

  @Post('expenses/:id/approve')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER)
  @Audit('Approved', 'ExpenseReport')
  @ApiOperation({ summary: 'Aprovar relatório de despesas' })
  @HttpCode(HttpStatus.OK)
  async approve(
    @Param('id') id: string,
    @Body() dto: ApproveExpenseDto,
    @Req() req: Request,
  ): Promise<ExpenseReport> {
    const user = req.user as JwtPayload;
    const approverId = await this.employeeIdentity.resolveEmployeeId(user.sub);
    return this.expensesService.approve(id, approverId, dto.comment);
  }

  @Post('expenses/:id/reject')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER)
  @Audit('Rejected', 'ExpenseReport')
  @ApiOperation({ summary: 'Rejeitar relatório de despesas' })
  @HttpCode(HttpStatus.OK)
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectExpenseDto,
    @Req() req: Request,
  ): Promise<ExpenseReport> {
    const user = req.user as JwtPayload;
    const approverId = await this.employeeIdentity.resolveEmployeeId(user.sub);
    return this.expensesService.reject(id, approverId, dto.reason);
  }

  @Post('expenses/:id/send-for-payment')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Enviar relatório de despesas aprovado para pagamento (admin only)' })
  @HttpCode(HttpStatus.OK)
  async sendForPayment(@Param('id') id: string): Promise<ExpenseReport> {
    return this.expensesService.sendForPayment(id);
  }

  @Post('expenses/:id/mark-paid')
  @Roles(RoleEnum.ADMIN)
  @Audit('Paid', 'ExpenseReport')
  @ApiOperation({ summary: 'Marcar relatório de despesas como pago (admin only)' })
  @HttpCode(HttpStatus.OK)
  async markPaid(@Param('id') id: string): Promise<ExpenseReport> {
    return this.expensesService.markPaid(id);
  }
}
