import { IsString, IsOptional, IsUUID, IsDateString, IsNumber, IsUrl, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExpenseItemDto {
  @ApiProperty({ description: 'ID da categoria de despesa' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ description: 'Descrição da despesa' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Valor da despesa' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ description: 'Moeda (default EUR)' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: 'Data da despesa' })
  @IsDateString()
  expenseDate: string;

  @ApiPropertyOptional({ description: 'URL do recibo/comprovativo' })
  @IsOptional()
  @IsUrl()
  receiptUrl?: string;
}
