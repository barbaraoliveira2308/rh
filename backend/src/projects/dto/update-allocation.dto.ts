import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AllocationType } from '../entities/project-allocation.entity';

export class UpdateAllocationDto {
  @ApiPropertyOptional({ description: 'Tipo de alocação', enum: AllocationType })
  @IsOptional()
  @IsEnum(AllocationType)
  allocationType?: AllocationType;

  @ApiPropertyOptional({ description: 'Valor da alocação' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  allocationValue?: number;

  @ApiPropertyOptional({ description: 'Data de início' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Data de fim' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Papel no projeto' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  roleInProject?: string;

  @ApiPropertyOptional({ description: 'Substituição de tarifário' })
  @IsOptional()
  @IsNumber()
  hourlyRateOverride?: number;

  @ApiPropertyOptional({ description: 'Dias para alerta de fim de alocação' })
  @IsOptional()
  @IsNumber()
  alertDaysBeforeEnd?: number;

  @ApiPropertyOptional({ description: 'Notas' })
  @IsOptional()
  @IsString()
  notes?: string;
}
