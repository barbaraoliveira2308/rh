import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ClientsService } from './services/clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { Client } from './entities/client.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { Roles } from '../rbac/decorators/roles.decorator';
import { RoleEnum } from '../rbac/enums/role.enum';

@Controller()
@ApiTags('Clients')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get('clients')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Listar clientes' })
  @HttpCode(HttpStatus.OK)
  async findAll(): Promise<Client[]> {
    return this.clientsService.findAll();
  }

  @Get('clients/:id')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Obter cliente por ID' })
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<Client> {
    return this.clientsService.findOne(id);
  }

  @Post('clients')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Criar cliente' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateClientDto): Promise<Client> {
    return this.clientsService.create(dto);
  }

  @Patch('clients/:id')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Atualizar cliente' })
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdateClientDto): Promise<Client> {
    return this.clientsService.update(id, dto);
  }

  @Delete('clients/:id')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Desativar cliente (soft delete)' })
  @HttpCode(HttpStatus.OK)
  async deactivate(@Param('id') id: string): Promise<Client> {
    return this.clientsService.deactivate(id);
  }

  @Get('clients/:id/projects')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Listar projetos do cliente' })
  @HttpCode(HttpStatus.OK)
  async getProjects(@Param('id') id: string): Promise<{ data: unknown[] }> {
    return this.clientsService.getProjects(id);
  }
}
