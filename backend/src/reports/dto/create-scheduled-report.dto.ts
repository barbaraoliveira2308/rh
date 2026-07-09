import { IsString, IsEnum, IsObject, IsArray, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReportType } from '../entities/report-type.enum';
import { ReportFrequency } from '../entities/report-frequency.enum';
import { ReportFormat } from '../entities/report-format.enum';

export class CreateScheduledReportDto {
  @ApiProperty({ description: 'Nome do relatório agendado' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Tipo de relatório', enum: ReportType })
  @IsEnum(ReportType)
  reportType: ReportType;

  @ApiProperty({ description: 'Filtros do relatório' })
  @IsObject()
  filters: Record<string, unknown>;

  @ApiProperty({ description: 'Frequência', enum: ReportFrequency })
  @IsEnum(ReportFrequency)
  frequency: ReportFrequency;

  @ApiProperty({ description: 'Destinatários (emails)' })
  @IsArray()
  @IsEmail({}, { each: true })
  recipients: string[];

  @ApiProperty({ description: 'Formato', enum: ReportFormat })
  @IsEnum(ReportFormat)
  format: ReportFormat;
}
