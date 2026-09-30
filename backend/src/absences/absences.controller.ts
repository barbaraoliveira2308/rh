import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AbsencesService } from './services/absences.service';
import { AbsenceType } from './entities/absence-type.entity';
import { AbsenceRequest } from './entities/absence-request.entity';
import { LeaveBalance } from './entities/leave-balance.entity';
import { AbsenceStatus } from './entities/absence-status.enum';
import { CreateAbsenceDto } from './dto/create-absence.dto';
import { ApproveAbsenceDto } from './dto/approve-absence.dto';
import { RejectAbsenceDto } from './dto/reject-absence.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { Roles } from '../rbac/decorators/roles.decorator';
import { RoleEnum } from '../rbac/enums/role.enum';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { EmployeeIdentityService } from '../auth/services/employee-identity.service';
import { Audit } from '../audit/decorators';
import { AuditInterceptor } from '../audit/interceptors/audit.interceptor';

@Controller()
@ApiTags('Absences')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@ApiBearerAuth()
export class AbsencesController {
  constructor(
    private readonly absencesService: AbsencesService,
    private readonly employeeIdentity: EmployeeIdentityService,
  ) {}

  @Get('absences')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Listar pedidos de ausência (com filtros)' })
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Req() req: Request,
    @Query('employee_id') employeeId?: string,
    @Query('type') type?: string,
    @Query('status') status?: AbsenceStatus,
    @Query('year') year?: number,
  ): Promise<AbsenceRequest[]> {
    const user = req.user as JwtPayload;
    const isAdminOrManager =
      user.roles.includes(RoleEnum.ADMIN) ||
      user.roles.includes(RoleEnum.MANAGER) ||
      user.roles.includes(RoleEnum.APPROVER);

    let callerEmployeeId: string | undefined;

    if (!isAdminOrManager) {
      callerEmployeeId = await this.employeeIdentity.resolveEmployeeId(user.sub);

      if (employeeId && employeeId !== callerEmployeeId) {
        throw new ForbiddenException('Apenas pode ver as suas próprias ausências');
      }
    }

    return this.absencesService.findAll({
      employeeId: isAdminOrManager ? employeeId : callerEmployeeId,
      type,
      status,
      year,
    });
  }

  @Post('absences')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @Audit('Requested', 'AbsenceRequest')
  @ApiOperation({ summary: 'Criar pedido de ausência' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateAbsenceDto, @Req() req: Request): Promise<AbsenceRequest> {
    const user = req.user as JwtPayload;
    const employeeId = await this.employeeIdentity.resolveEmployeeId(user.sub);
    return this.absencesService.create(dto, employeeId);
  }

  @Get('absences/types')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Listar tipos de ausência ativos' })
  @HttpCode(HttpStatus.OK)
  async findTypes(): Promise<AbsenceType[]> {
    return this.absencesService.findTypes();
  }

  @Get('absences/calendar')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Calendário de ausências da equipa' })
  @HttpCode(HttpStatus.OK)
  async getCalendar(@Query('month') _month: string): Promise<AbsenceRequest[]> {
    return this.absencesService.findAll({ status: AbsenceStatus.APPROVED });
  }

  @Get('absences/:id')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Obter pedido de ausência por ID' })
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string, @Req() req: Request): Promise<AbsenceRequest> {
    const user = req.user as JwtPayload;
    const isAdminOrManager =
      user.roles.includes(RoleEnum.ADMIN) ||
      user.roles.includes(RoleEnum.MANAGER) ||
      user.roles.includes(RoleEnum.APPROVER);

    if (!isAdminOrManager) {
      const request = await this.absencesService.findOne(id);
      const callerEmployeeId = await this.employeeIdentity.resolveEmployeeId(user.sub);
      if (request.employeeId !== callerEmployeeId) {
        throw new ForbiddenException('Acesso negado a este pedido');
      }
    }

    return this.absencesService.findOne(id);
  }

  @Post('absences/:id/approve')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER)
  @Audit('Approved', 'AbsenceRequest')
  @ApiOperation({ summary: 'Aprovar pedido de ausência' })
  @HttpCode(HttpStatus.OK)
  async approve(
    @Param('id') id: string,
    @Body() _dto: ApproveAbsenceDto,
    @Req() req: Request,
  ): Promise<AbsenceRequest> {
    const user = req.user as JwtPayload;
    const approverId = await this.employeeIdentity.resolveEmployeeId(user.sub);
    return this.absencesService.approve(id, approverId);
  }

  @Post('absences/:id/reject')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER)
  @Audit('Rejected', 'AbsenceRequest')
  @ApiOperation({ summary: 'Rejeitar pedido de ausência' })
  @HttpCode(HttpStatus.OK)
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectAbsenceDto,
    @Req() req: Request,
  ): Promise<AbsenceRequest> {
    const user = req.user as JwtPayload;
    const approverId = await this.employeeIdentity.resolveEmployeeId(user.sub);
    return this.absencesService.reject(id, approverId, dto.reason);
  }

  @Post('absences/:id/cancel')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @Audit('Cancelled', 'AbsenceRequest')
  @ApiOperation({ summary: 'Cancelar pedido de ausência' })
  @HttpCode(HttpStatus.OK)
  async cancel(@Param('id') id: string, @Req() req: Request): Promise<AbsenceRequest> {
    const user = req.user as JwtPayload;
    const employeeId = await this.employeeIdentity.resolveEmployeeId(user.sub);
    return this.absencesService.cancel(id, employeeId);
  }

  @Post('absences/:id/document')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Upload de documento justificativo' })
  @HttpCode(HttpStatus.OK)
  async uploadDocument(
    @Param('id') id: string,
    @Body() body: { documentUrl: string },
    @Req() req: Request,
  ): Promise<AbsenceRequest> {
    const user = req.user as JwtPayload;
    const request = await this.absencesService.findOne(id);
    const employeeId = await this.employeeIdentity.resolveEmployeeId(user.sub);

    if (request.employeeId !== employeeId) {
      throw new ForbiddenException('Apenas o próprio pode anexar documentos');
    }

    if (request.status !== AbsenceStatus.PENDING) {
      throw new ForbiddenException('Apenas pedidos pendentes podem ser alterados');
    }

    return this.absencesService.updateDocument(id, body.documentUrl);
  }

  @Get('absences/balance/:employeeId')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Obter saldo de ausências' })
  @HttpCode(HttpStatus.OK)
  async getBalance(
    @Param('employeeId') employeeId: string,
    @Req() req: Request,
    @Query('year') year?: number,
  ): Promise<LeaveBalance[]> {
    const user = req.user as JwtPayload;
    const isAdminOrManager =
      user.roles.includes(RoleEnum.ADMIN) ||
      user.roles.includes(RoleEnum.MANAGER) ||
      user.roles.includes(RoleEnum.APPROVER);

    if (!isAdminOrManager) {
      const callerEmployeeId = await this.employeeIdentity.resolveEmployeeId(user.sub);
      if (employeeId !== callerEmployeeId) {
        throw new ForbiddenException('Acesso negado');
      }
    }

    const targetYear = year ?? new Date().getFullYear();
    return this.absencesService.getLeaveBalance(employeeId, targetYear);
  }
}
