import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SecurityIncidentStatus } from '../entities/security-incident-status.enum';

export class UpdateIncidentDto {
  @ApiPropertyOptional({ description: 'Estado do incidente', enum: SecurityIncidentStatus })
  @IsOptional()
  @IsEnum(SecurityIncidentStatus)
  status?: SecurityIncidentStatus;

  @ApiPropertyOptional({ description: 'Notas de resolução' })
  @IsOptional()
  @IsString()
  resolutionNotes?: string;

  @ApiPropertyOptional({ description: 'Data/hora de reporte à autoridade (CNPD)' })
  @IsOptional()
  @IsDateString()
  reportedToAuthorityAt?: string;
}
