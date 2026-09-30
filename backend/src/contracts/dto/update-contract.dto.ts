import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContractType, ContractStatus } from '../entities/contract.entity';

export class UpdateContractDto {
  @ApiPropertyOptional({ description: 'Tipo de contrato', enum: ContractType })
  @IsOptional()
  @IsEnum(ContractType)
  contractType?: ContractType;

  @ApiPropertyOptional({ description: 'Estado', enum: ContractStatus })
  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;

  @ApiPropertyOptional({ description: 'Data de início' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Data de fim' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Valor' })
  @IsOptional()
  @IsNumber()
  value?: number;

  @ApiPropertyOptional({ description: 'Compensação mensal' })
  @IsOptional()
  @IsNumber()
  monthlyCost?: number;

  @ApiPropertyOptional({ description: 'Moeda' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ description: 'Entidade contratante' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  contractingEntity?: string;

  @ApiPropertyOptional({ description: 'ID da entidade legal (LegalEntity)' })
  @IsOptional()
  @IsUUID()
  legalEntityId?: string;

  @ApiPropertyOptional({ description: 'Dias para alerta de renovação' })
  @IsOptional()
  @IsNumber()
  renewalAlertDays?: number;

  @ApiPropertyOptional({ description: 'URL do documento' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  documentUrl?: string;

  @ApiPropertyOptional({ description: 'Notas' })
  @IsOptional()
  @IsString()
  notes?: string;
}
