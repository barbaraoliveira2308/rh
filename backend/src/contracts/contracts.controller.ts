import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ContractsService } from './services/contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { RenewContractDto } from './dto/renew-contract.dto';
import { Contract, ContractStatus } from './entities/contract.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { Roles } from '../rbac/decorators/roles.decorator';
import { RoleEnum } from '../rbac/enums/role.enum';
import { Audit } from '../audit/decorators';
import { AuditInterceptor } from '../audit/interceptors/audit.interceptor';

@Controller()
@ApiTags('Contracts')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@ApiBearerAuth()
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get('contracts')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Listar contratos (com filtros)' })
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('status') status?: ContractStatus,
    @Query('employeeId') employeeId?: string,
  ): Promise<Contract[]> {
    return this.contractsService.findAll({ status, employeeId });
  }

  @Get('contracts/:id')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Obter contrato por ID' })
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<Contract> {
    return this.contractsService.findOne(id);
  }

  @Post('contracts')
  @Roles(RoleEnum.ADMIN)
  @Audit('Created', 'Contract')
  @ApiOperation({ summary: 'Criar contrato' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateContractDto): Promise<Contract> {
    return this.contractsService.create(dto);
  }

  @Patch('contracts/:id')
  @Roles(RoleEnum.ADMIN)
  @Audit('Updated', 'Contract')
  @ApiOperation({ summary: 'Atualizar contrato' })
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdateContractDto): Promise<Contract> {
    return this.contractsService.update(id, dto);
  }

  @Post('contracts/:id/renew')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Renovar contrato' })
  @HttpCode(HttpStatus.OK)
  async renew(@Param('id') id: string, @Body() dto: RenewContractDto): Promise<Contract> {
    return this.contractsService.renew(id, dto);
  }

  @Get('contracts/:id/document')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Obter documento do contrato (presigned URL)' })
  @HttpCode(HttpStatus.OK)
  async getDocument(@Param('id') id: string): Promise<{ url: string }> {
    const url = await this.contractsService.getDocumentPresignedUrl(id);
    return { url };
  }
}
