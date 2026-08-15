import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { WorkflowService } from './services/workflow.service';
import { WorkflowItem } from './entities/workflow-item.entity';
import { WorkflowItemStatus } from './entities/workflow-item-status.enum';
import { WorkflowActionDto } from './dto/workflow-action.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { Roles } from '../rbac/decorators/roles.decorator';
import { RoleEnum } from '../rbac/enums/role.enum';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { EmployeeIdentityService } from '../auth/services/employee-identity.service';

@Controller()
@ApiTags('Workflow')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class WorkflowController {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly employeeIdentity: EmployeeIdentityService,
  ) {}

  @Get('workflow/inbox')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER)
  @ApiOperation({ summary: 'Listar itens pendentes da caixa de entrada' })
  @HttpCode(HttpStatus.OK)
  async findInbox(
    @Req() req: Request,
    @Query('status') status?: WorkflowItemStatus,
  ): Promise<WorkflowItem[]> {
    const user = req.user as JwtPayload;
    const employeeId = await this.employeeIdentity.resolveEmployeeId(user.sub);
    return this.workflowService.findInbox(employeeId, status);
  }

  @Get('workflow/inbox/count')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER)
  @ApiOperation({ summary: 'Contador de itens pendentes' })
  @HttpCode(HttpStatus.OK)
  async countPending(@Req() req: Request): Promise<{ count: number }> {
    const user = req.user as JwtPayload;
    const employeeId = await this.employeeIdentity.resolveEmployeeId(user.sub);
    const count = await this.workflowService.countPending(employeeId);
    return { count };
  }

  @Post('workflow/inbox/:id/approve')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER)
  @ApiOperation({ summary: 'Aprovar item da caixa de entrada' })
  @HttpCode(HttpStatus.OK)
  async approve(
    @Param('id') id: string,
    @Body() dto: WorkflowActionDto,
    @Req() req: Request,
  ): Promise<WorkflowItem> {
    const user = req.user as JwtPayload;
    const employeeId = await this.employeeIdentity.resolveEmployeeId(user.sub);
    return this.workflowService.approve(id, employeeId, dto.reason);
  }

  @Post('workflow/inbox/:id/reject')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER)
  @ApiOperation({ summary: 'Rejeitar item da caixa de entrada' })
  @HttpCode(HttpStatus.OK)
  async reject(
    @Param('id') id: string,
    @Body() dto: WorkflowActionDto,
    @Req() req: Request,
  ): Promise<WorkflowItem> {
    const user = req.user as JwtPayload;
    const employeeId = await this.employeeIdentity.resolveEmployeeId(user.sub);
    return this.workflowService.reject(id, employeeId, dto.reason ?? '');
  }
}
