import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { ContractsService } from './services/contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { RenewContractDto } from './dto/renew-contract.dto';
import { TerminateContractDto } from './dto/terminate-contract.dto';
import { Contract, ContractStatus } from './entities/contract.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { Roles } from '../rbac/decorators/roles.decorator';
import { RoleEnum } from '../rbac/enums/role.enum';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { Audit } from '../audit/decorators';
import { AuditInterceptor } from '../audit/interceptors/audit.interceptor';

function maskContractValue(contract: Contract, isAdmin: boolean): Contract {
  if (isAdmin) {
    return contract;
  }
  return Object.assign(new Contract(), contract, { value: null });
}

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
    @Req() req: Request,
    @Query('status') status?: ContractStatus,
    @Query('employeeId') employeeId?: string,
  ): Promise<Contract[]> {
    const user = req.user as JwtPayload;
    const isAdmin = user.roles.includes(RoleEnum.ADMIN);
    const contracts = await this.contractsService.findAll({ status, employeeId });
    return contracts.map((contract) => maskContractValue(contract, isAdmin));
  }

  @Get('contracts/me')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Listar contratos do colaborador autenticado' })
  @HttpCode(HttpStatus.OK)
  async findMine(@Req() req: Request): Promise<Contract[]> {
    const user = req.user as JwtPayload;
    return this.contractsService.findForUser(user.sub);
  }

  @Get('contracts/:id')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Obter contrato por ID' })
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string, @Req() req: Request): Promise<Contract> {
    const user = req.user as JwtPayload;
    const isAdmin = user.roles.includes(RoleEnum.ADMIN);
    const contract = await this.contractsService.findOne(id);
    return maskContractValue(contract, isAdmin);
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

  @Patch('contracts/me/:id')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @Audit('Updated', 'Contract')
  @ApiOperation({ summary: 'Atualizar contrato próprio (admin ou gestor)' })
  @HttpCode(HttpStatus.OK)
  async updateMine(
    @Param('id') id: string,
    @Body() dto: UpdateContractDto,
    @Req() req: Request,
  ): Promise<Contract> {
    const user = req.user as JwtPayload;
    return this.contractsService.updateForUser(user.sub, id, dto);
  }

  @Post('contracts/:id/renew')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Renovar contrato' })
  @HttpCode(HttpStatus.OK)
  async renew(@Param('id') id: string, @Body() dto: RenewContractDto): Promise<Contract> {
    return this.contractsService.renew(id, dto);
  }

  @Post('contracts/:id/terminate')
  @Roles(RoleEnum.ADMIN)
  @Audit('Terminated', 'Contract')
  @ApiOperation({ summary: 'Rescindir contrato' })
  @HttpCode(HttpStatus.OK)
  async terminate(@Param('id') id: string, @Body() dto: TerminateContractDto): Promise<Contract> {
    return this.contractsService.terminate(id, dto);
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
