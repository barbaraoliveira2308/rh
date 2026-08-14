import { Controller, Get, Put, Post, Patch, Param, Body, UseGuards, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { Roles } from '../rbac/decorators/roles.decorator';
import { RoleEnum } from '../rbac/enums/role.enum';
import { AdminService } from './admin.service';
import { UpdateSystemSettingsDto } from './dto/update-system-settings.dto';
import { CreateLegalEntityDto } from './dto/create-legal-entity.dto';
import { UpdateLegalEntityDto } from './dto/update-legal-entity.dto';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check do módulo Admin (público)' })
  health() {
    return this.adminService.health();
  }

  @Get('metrics')
  @Header('Content-Type', 'text/plain')
  @ApiOperation({ summary: 'Métricas em formato Prometheus (público)' })
  async metrics(): Promise<string> {
    return this.adminService.metrics();
  }

  @Get('settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Obter configurações globais do sistema (admin)' })
  async getSettings() {
    return this.adminService.getSettings();
  }

  @Put('settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Atualizar configurações globais do sistema (admin)' })
  async updateSettings(@Body() dto: UpdateSystemSettingsDto) {
    return this.adminService.updateSettings(dto);
  }

  @Get('legal-entities')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Listar entidades legais (admin)' })
  async findLegalEntities() {
    return this.adminService.findLegalEntities();
  }

  @Post('legal-entities')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Criar entidade legal (admin)' })
  async createLegalEntity(@Body() dto: CreateLegalEntityDto) {
    return this.adminService.createLegalEntity(dto);
  }

  @Patch('legal-entities/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Atualizar entidade legal (admin)' })
  async updateLegalEntity(@Param('id') id: string, @Body() dto: UpdateLegalEntityDto) {
    return this.adminService.updateLegalEntity(id, dto);
  }
}
