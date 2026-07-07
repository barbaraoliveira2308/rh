import {
  Controller,
  Get,
  Query,
  UseGuards,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { AuditService } from './services/audit.service';
import { AuditFiltersDto, ExportFormat, PaginatedResult } from './dto';
import { AuditLog } from './entities/audit-log.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { Roles } from '../rbac/decorators/roles.decorator';
import { RoleEnum } from '../rbac/enums/role.enum';

@ApiTags('Audit')
@Controller('audit/logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleEnum.ADMIN)
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Listar logs de auditoria (admin only)' })
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query() filters: AuditFiltersDto,
  ): Promise<PaginatedResult<AuditLog>> {
    return this.auditService.findAll(filters);
  }

  @Get('export')
  @ApiOperation({ summary: 'Exportar logs de auditoria (CSV)' })
  @ApiQuery({ name: 'format', required: false, enum: ExportFormat })
  @HttpCode(HttpStatus.OK)
  async export(
    @Query() filters: AuditFiltersDto,
    @Res() res: Response,
  ): Promise<void> {
    const logs = await this.auditService.findAllForExport(filters);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`,
    );

    const header = 'id,user_id,action,entity_type,entity_id,ip_address,timestamp,module,correlation_id\n';
    const rows = logs
      .map(
        (log) =>
          `${log.id},${log.userId ?? ''},${log.action},${log.entityType},${log.entityId},${log.ipAddress ?? ''},${log.timestamp.toISOString()},${log.module},${log.correlationId ?? ''}`,
      )
      .join('\n');

    res.send(header + rows);
  }
}
