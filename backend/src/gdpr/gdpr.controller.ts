import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  Req,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { GdprService } from './services/gdpr.service';
import { RecordConsentDto } from './dto/record-consent.dto';
import { RevokeConsentDto } from './dto/revoke-consent.dto';
import { CreateDataRequestDto } from './dto/create-data-request.dto';
import { CompleteRequestDto } from './dto/complete-request.dto';
import { CreateRetentionPolicyDto } from './dto/create-retention-policy.dto';
import { ReportIncidentDto } from './dto/report-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { UpdateRetentionPolicyDto } from './dto/update-retention-policy.dto';
import { RejectRequestDto } from './dto/reject-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { Roles } from '../rbac/decorators/roles.decorator';
import { RoleEnum } from '../rbac/enums/role.enum';
import { EmployeeIdentityService } from '../auth/services/employee-identity.service';
import { ConsentRecord } from './entities/consent-record.entity';
import { DataSubjectRequest } from './entities/data-subject-request.entity';
import { RetentionPolicy } from './entities/retention-policy.entity';
import { SecurityIncident } from './entities/security-incident.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { Audit } from '../audit/decorators';
import { AuditInterceptor } from '../audit/interceptors/audit.interceptor';

interface RequestWithUser extends Request {
  user?: { sub: string; roles: string[] };
}

@ApiTags('GDPR')
@Controller('gdpr')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@ApiBearerAuth()
export class GdprController {
  constructor(
    private readonly gdprService: GdprService,
    private readonly employeeIdentity: EmployeeIdentityService,
  ) {}

  @Get('consents/:employeeId')
  @ApiOperation({ summary: 'Listar consentimentos de um colaborador' })
  async getConsents(
    @Param('employeeId') employeeId: string,
    @Req() req: RequestWithUser,
  ): Promise<ConsentRecord[]> {
    await this.ensureSelfOrAdmin(employeeId, req);
    return this.gdprService.findConsents(employeeId);
  }

  @Post('consents/:employeeId/revoke')
  @HttpCode(HttpStatus.OK)
  @Audit('ConsentChanged', 'ConsentRecord')
  @ApiOperation({ summary: 'Revogar consentimento de um colaborador' })
  async revokeConsent(
    @Param('employeeId') employeeId: string,
    @Body() dto: RevokeConsentDto,
    @Req() req: RequestWithUser,
  ): Promise<ConsentRecord> {
    await this.ensureSelfOrAdmin(employeeId, req);
    return this.gdprService.revokeConsent(employeeId, dto.purpose);
  }

  @Post('consents')
  @Roles(RoleEnum.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @Audit('ConsentChanged', 'ConsentRecord')
  @ApiOperation({ summary: 'Registar consentimento (admin)' })
  async recordConsent(
    @Body() dto: RecordConsentDto,
    @Req() req: RequestWithUser,
  ): Promise<ConsentRecord> {
    return this.gdprService.recordConsent(dto, req.ip ?? undefined);
  }

  @Get('requests')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Listar pedidos de titular' })
  async getRequests(): Promise<DataSubjectRequest[]> {
    return this.gdprService.findRequests();
  }

  @Post('requests')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submeter pedido de titular' })
  async createRequest(
    @Body() dto: CreateDataRequestDto,
    @Req() req: RequestWithUser,
  ): Promise<DataSubjectRequest> {
    await this.ensureSelfOrAdmin(dto.subjectId, req);
    return this.gdprService.createDataRequest(dto);
  }

  @Patch('requests/:id/complete')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Completar pedido de titular' })
  async completeRequest(
    @Param('id') id: string,
    @Body() dto: CompleteRequestDto,
  ): Promise<DataSubjectRequest> {
    return this.gdprService.completeRequest(id, dto.notes);
  }

  @Patch('requests/:id/reject')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Rejeitar pedido de titular' })
  async rejectRequest(
    @Param('id') id: string,
    @Body() dto: RejectRequestDto,
  ): Promise<DataSubjectRequest> {
    return this.gdprService.rejectRequest(id, dto.notes);
  }

  @Get('retention-policies')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Listar políticas de retenção' })
  async getRetentionPolicies(): Promise<RetentionPolicy[]> {
    return this.gdprService.findRetentionPolicies();
  }

  @Post('retention-policies')
  @Roles(RoleEnum.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar política de retenção' })
  async createRetentionPolicy(@Body() dto: CreateRetentionPolicyDto): Promise<RetentionPolicy> {
    return this.gdprService.createRetentionPolicy(dto);
  }

  @Patch('retention-policies/:id')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Ativar/desativar política de retenção' })
  async updateRetentionPolicy(
    @Param('id') id: string,
    @Body() dto: UpdateRetentionPolicyDto,
  ): Promise<RetentionPolicy> {
    return this.gdprService.updateRetentionPolicy(id, dto);
  }

  @Get('incidents')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Listar incidentes de segurança' })
  async getIncidents(): Promise<SecurityIncident[]> {
    return this.gdprService.findIncidents();
  }

  @Post('incidents')
  @Roles(RoleEnum.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registar incidente de segurança' })
  async reportIncident(@Body() dto: ReportIncidentDto): Promise<SecurityIncident> {
    return this.gdprService.reportIncident(dto);
  }

  @Patch('incidents/:id')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Atualizar incidente de segurança (estado, notas de resolução)' })
  async updateIncident(
    @Param('id') id: string,
    @Body() dto: UpdateIncidentDto,
  ): Promise<SecurityIncident> {
    return this.gdprService.updateIncident(id, dto);
  }

  @Get('reports/compliance')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Relatório de conformidade GDPR' })
  async getComplianceReport(): Promise<Record<string, unknown>> {
    return this.gdprService.getComplianceReport();
  }

  @Get('reports/consents')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Relatório: consentimentos ativos por titular e finalidade' })
  async getConsentsReport(): Promise<ConsentRecord[]> {
    return this.gdprService.getConsentsReport();
  }

  @Get('reports/access-history')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({
    summary:
      'Relatório: histórico de alterações a dados pessoais, por utilizador e período (aproximação via AuditLog — só regista mutações, não leituras)',
  })
  async getAccessHistoryReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<AuditLog[]> {
    return this.gdprService.getAccessHistoryReport(startDate, endDate);
  }

  @Get('reports/erasure-anonymization')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({
    summary: 'Relatório: pedidos de eliminação e anonimizações automáticas (estado e prazo)',
  })
  async getErasureAndAnonymizationReport(): Promise<{
    requests: DataSubjectRequest[];
    automaticAnonymizations: AuditLog[];
  }> {
    return this.gdprService.getErasureAndAnonymizationReport();
  }

  @Get('reports/exports')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Relatório: exportações de dados pessoais realizadas' })
  async getExportsReport(): Promise<DataSubjectRequest[]> {
    return this.gdprService.getExportsReport();
  }

  @Get('reports/audit-by-module')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Relatório: auditoria GDPR geral, conformidade por módulo' })
  async getAuditByModuleReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<{ module: string; count: number }[]> {
    return this.gdprService.getAuditByModuleReport(startDate, endDate);
  }

  private async ensureSelfOrAdmin(employeeId: string, req: RequestWithUser): Promise<void> {
    const user = req.user;

    if (!user) {
      throw new ForbiddenException('Utilizador não autenticado');
    }

    if (user.roles.includes(RoleEnum.ADMIN)) {
      return;
    }

    const callerEmployeeId = await this.employeeIdentity.resolveEmployeeId(user.sub);

    if (callerEmployeeId === employeeId) {
      return;
    }

    throw new ForbiddenException('Acesso negado');
  }
}
