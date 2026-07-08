import { IsString, IsOptional, IsNumber, IsUUID, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTimesheetEntryDto {
  @ApiPropertyOptional({ description: 'Horas trabalhadas' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(24)
  workedHours?: number;

  @ApiPropertyOptional({ description: 'ID do projeto' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Notas' })
  @IsOptional()
  @IsString()
  notes?: string;
}
