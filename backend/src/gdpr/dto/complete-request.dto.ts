import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CompleteRequestDto {
  @ApiPropertyOptional({ description: 'Notas sobre o processamento' })
  @IsOptional()
  @IsString()
  notes?: string;
}
