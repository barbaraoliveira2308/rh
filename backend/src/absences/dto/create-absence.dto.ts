import { IsString, IsOptional, IsUUID, IsDateString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAbsenceDto {
  @ApiProperty({ description: 'ID do tipo de ausência' })
  @IsUUID()
  absenceTypeId: string;

  @ApiProperty({ description: 'Data de início' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Data de fim' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'Início em meio-dia' })
  @IsOptional()
  @IsBoolean()
  startHalf?: boolean;

  @ApiPropertyOptional({ description: 'Fim em meio-dia' })
  @IsOptional()
  @IsBoolean()
  endHalf?: boolean;

  @ApiPropertyOptional({ description: 'Motivo' })
  @IsOptional()
  @IsString()
  reason?: string;
}
