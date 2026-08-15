import {
  IsString,
  IsEnum,
  IsObject,
  IsArray,
  IsEmail,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ReportType } from '../entities/report-type.enum';
import { ReportFrequency } from '../entities/report-frequency.enum';
import { ReportFormat } from '../entities/report-format.enum';

export class UpdateScheduledReportDto {
  @ApiPropertyOptional({ description: 'Nome do relatório agendado' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Tipo de relatório', enum: ReportType })
  @IsOptional()
  @IsEnum(ReportType)
  reportType?: ReportType;

  @ApiPropertyOptional({ description: 'Filtros do relatório' })
  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Frequência', enum: ReportFrequency })
  @IsOptional()
  @IsEnum(ReportFrequency)
  frequency?: ReportFrequency;

  @ApiPropertyOptional({ description: 'Destinatários (emails)' })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  recipients?: string[];

  @ApiPropertyOptional({ description: 'Formato', enum: ReportFormat })
  @IsOptional()
  @IsEnum(ReportFormat)
  format?: ReportFormat;

  @ApiPropertyOptional({ description: 'Agendamento ativo' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
