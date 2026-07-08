import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateExpenseItemDto } from './create-expense-item.dto';

export class CreateExpenseReportDto {
  @ApiProperty({ description: 'Título do relatório de despesas' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Data de início do período' })
  @IsDateString()
  periodStart: string;

  @ApiProperty({ description: 'Data de fim do período' })
  @IsDateString()
  periodEnd: string;

  @ApiPropertyOptional({ description: 'ID do projeto associado' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Notas adicionais' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Itens iniciais do relatório' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateExpenseItemDto)
  items?: CreateExpenseItemDto[];
}
