import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RejectExpenseDto {
  @ApiProperty({ description: 'Motivo da rejeição' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: 'Comentário adicional' })
  @IsOptional()
  @IsString()
  comment?: string;
}
