import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContractType, ContractStatus } from '../entities/contract.entity';

export class CreateContractDto {
  @ApiProperty({ description: 'ID do colaborador' })
  @IsUUID()
  employeeId: string;

  @ApiProperty({ description: 'Tipo de contrato', enum: ContractType })
  @IsEnum(ContractType)
  contractType: ContractType;

  @ApiPropertyOptional({ description: 'Estado', enum: ContractStatus })
  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;

  @ApiProperty({ description: 'Data de início' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ description: 'Data de fim' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Valor' })
  @IsOptional()
  @IsNumber()
  value?: number;

  @ApiPropertyOptional({ description: 'Moeda', default: 'EUR' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiProperty({ description: 'Entidade contratante' })
  @IsString()
  @MaxLength(200)
  contractingEntity: string;

  @ApiPropertyOptional({ description: 'Dias para alerta de renovação', default: 30 })
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
