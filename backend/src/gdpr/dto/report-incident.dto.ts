import { IsString, IsEnum, IsOptional, IsInt, IsUUID } from 'class-validator';
import { SecurityIncidentSeverity } from '../entities/security-incident-severity.enum';

export class ReportIncidentDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(SecurityIncidentSeverity)
  severity: SecurityIncidentSeverity;

  @IsOptional()
  @IsInt()
  affectedSubjects?: number;

  @IsOptional()
  @IsUUID()
  reportedBy?: string;
}
