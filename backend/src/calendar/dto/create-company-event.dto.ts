import { IsString, IsDateString, IsOptional, IsEnum, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CompanyEventType } from '../entities/company-event.entity';

export class CreateCompanyEventDto {
  @ApiProperty({ description: 'Título do evento', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ description: 'Descrição' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Data de início' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ description: 'Data de fim' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Tipo de evento', enum: CompanyEventType })
  @IsEnum(CompanyEventType)
  @IsOptional()
  type?: CompanyEventType;

  @ApiPropertyOptional({ description: 'Cor (hex)', maxLength: 7 })
  @IsString()
  @MaxLength(7)
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ description: 'Evento recorrente' })
  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;
}
