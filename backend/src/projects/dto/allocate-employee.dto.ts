import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AllocationType } from '../entities/project-allocation.entity';

export class AllocateEmployeeDto {
  @ApiProperty({ description: 'ID do colaborador' })
  @IsString()
  employeeId: string;

  @ApiProperty({ description: 'Tipo de alocação', enum: AllocationType })
  @IsEnum(AllocationType)
  allocationType: AllocationType;

  @ApiProperty({ description: 'Valor da alocação (0-100 se percentage, >0 se hours)' })
  @IsNumber()
  @Min(0)
  allocationValue: number;

  @ApiProperty({ description: 'Data de início' })
  @IsDateString()
  startDate: string;

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

  @ApiPropertyOptional({ description: 'Dias para alerta de fim de alocação', default: 15 })
  @IsOptional()
  @IsNumber()
  alertDaysBeforeEnd?: number;

  @ApiPropertyOptional({ description: 'Notas' })
  @IsOptional()
  @IsString()
  notes?: string;
}
