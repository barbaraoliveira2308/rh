import { IsString, IsOptional, IsInt, Min, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLegalEntityDto {
  @ApiPropertyOptional({ description: 'Nome da entidade legal' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'NIF da entidade' })
  @IsOptional()
  @IsString()
  nif?: string;

  @ApiPropertyOptional({ description: 'País (ISO 3166-1 alpha-2)' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'Moeda (ISO 4217)' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'País do perfil de calendário de feriados' })
  @IsOptional()
  @IsString()
  calendarProfileCountryCode?: string;

  @ApiPropertyOptional({ description: 'Dias de férias por ano específicos desta entidade' })
  @IsOptional()
  @IsInt()
  @Min(0)
  vacationDaysPerYearOverride?: number;

  @ApiPropertyOptional({ description: 'Entidade ativa' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
