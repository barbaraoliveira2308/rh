import { IsString, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExpenseCategoryDto {
  @ApiProperty({ description: 'Nome da categoria' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Código único da categoria' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: 'Limite por relatório' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  limitAmount?: number;

  @ApiPropertyOptional({ description: 'Exige recibo/comprovativo' })
  @IsOptional()
  @IsBoolean()
  requiresReceipt?: boolean;
}
