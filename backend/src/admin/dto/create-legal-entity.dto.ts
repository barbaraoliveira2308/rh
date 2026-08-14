import { IsString, IsOptional, IsInt, Min, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLegalEntityDto {
  @ApiProperty({ description: 'Nome da entidade legal' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'NIF da entidade' })
  @IsOptional()
  @IsString()
  nif?: string;

  @ApiProperty({ description: 'País (ISO 3166-1 alpha-2)' })
  @IsString()
  country: string;

  @ApiProperty({ description: 'Moeda (ISO 4217)' })
  @IsString()
  currency: string;

  @ApiProperty({ description: 'País do perfil de calendário de feriados' })
  @IsString()
  calendarProfileCountryCode: string;

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
