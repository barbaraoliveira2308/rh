import { IsString, IsEnum, IsOptional, IsInt, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SecurityIncidentSeverity } from '../entities/security-incident-severity.enum';

export class ReportIncidentDto {
  @ApiProperty({ description: 'Título do incidente' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Descrição' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Severidade', enum: SecurityIncidentSeverity })
  @IsEnum(SecurityIncidentSeverity)
  severity: SecurityIncidentSeverity;

  @ApiPropertyOptional({ description: 'Número de titulares afectados' })
  @IsOptional()
  @IsInt()
  affectedSubjects?: number;

  @ApiPropertyOptional({ description: 'ID do reportante' })
  @IsOptional()
  @IsUUID()
  reportedBy?: string;
}
