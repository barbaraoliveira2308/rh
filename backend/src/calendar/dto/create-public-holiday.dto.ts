import { IsString, IsDateString, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePublicHolidayDto {
  @ApiProperty({ description: 'Código do país (ISO 3166-1 alpha-2)', maxLength: 5 })
  @IsString()
  @MaxLength(5)
  countryCode: string;

  @ApiProperty({ description: 'Data do feriado' })
  @IsDateString()
  holidayDate: string;

  @ApiProperty({ description: 'Nome do feriado', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'Nome local', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  localName?: string;

  @ApiPropertyOptional({ description: 'Feriado nacional' })
  @IsBoolean()
  @IsOptional()
  global?: boolean;

  @ApiPropertyOptional({ description: 'Região', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  region?: string;

  @ApiPropertyOptional({ description: 'Tipo', maxLength: 50 })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  type?: string;
}
