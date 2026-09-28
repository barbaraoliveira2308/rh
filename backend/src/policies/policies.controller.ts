import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { Roles } from '../rbac/decorators/roles.decorator';
import { RoleEnum } from '../rbac/enums/role.enum';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PoliciesService } from './policies.service';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { PolicyStatus } from './entities/policy-status.enum';

@ApiTags('Policies')
@Controller('policies')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar políticas publicadas (admin pode filtrar por estado, incl. rascunhos)',
  })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'status', required: false, enum: PolicyStatus })
  async findAll(
    @Req() req: Request,
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('status') status?: PolicyStatus,
  ) {
    const user = req.user as JwtPayload;
    const canManage = user.roles.includes(RoleEnum.ADMIN) || user.roles.includes(RoleEnum.MANAGER);
    return this.policiesService.findAll(q, category, status, canManage);
  }

  @Get('acceptance/pending')
  @ApiOperation({ summary: 'Listar políticas pendentes de aceite do utilizador' })
  async pendingAcceptances(@Req() req: Request) {
    const user = req.user as JwtPayload;
    return this.policiesService.findPendingAcceptances(user.sub);
  }

  @Get('acceptance/logs')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Consultar logs de aceite de políticas' })
  async acceptanceLogs() {
    return this.policiesService.findAcceptanceLogs();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter política por ID' })
  async findOne(@Param('id') id: string) {
    return this.policiesService.findOne(id);
  }

  @Get(':id/versions')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Listar versões de uma política (admin, gestor)' })
  async findVersions(@Param('id') id: string) {
    return this.policiesService.findVersions(id);
  }

  @Post()
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar política (admin, gestor)' })
  async create(@Body() dto: CreatePolicyDto, @Req() req: Request) {
    const user = req.user as JwtPayload;
    return this.policiesService.create(dto, user.sub);
  }

  @Patch(':id')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Atualizar política — cria nova versão (admin, gestor)' })
  async update(@Param('id') id: string, @Body() dto: UpdatePolicyDto) {
    return this.policiesService.update(id, dto);
  }

  @Post(':id/publish')
  @Roles(RoleEnum.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publicar política (admin)' })
  async publish(@Param('id') id: string) {
    return this.policiesService.publish(id);
  }

  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Registar aceite de uma política publicada' })
  async accept(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as JwtPayload;
    return this.policiesService.acceptPolicy(id, user.sub);
  }

  @Delete(':id')
  @Roles(RoleEnum.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Arquivar política (admin)' })
  async remove(@Param('id') id: string) {
    await this.policiesService.archive(id);
  }
}
