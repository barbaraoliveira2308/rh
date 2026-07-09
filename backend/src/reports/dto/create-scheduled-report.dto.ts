import { IsString, IsEnum, IsObject, IsArray, IsEmail } from 'class-validator';
import { ReportType } from '../entities/report-type.enum';
import { ReportFrequency } from '../entities/report-frequency.enum';
import { ReportFormat } from '../entities/report-format.enum';

export class CreateScheduledReportDto {
  @IsString()
  name: string;

  @IsEnum(ReportType)
  reportType: ReportType;

  @IsObject()
  filters: Record<string, unknown>;

  @IsEnum(ReportFrequency)
  frequency: ReportFrequency;

  @IsArray()
  @IsEmail({}, { each: true })
  recipients: string[];

  @IsEnum(ReportFormat)
  format: ReportFormat;
}
