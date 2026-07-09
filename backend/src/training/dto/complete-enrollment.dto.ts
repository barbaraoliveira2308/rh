import { IsOptional, IsNumber, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CompleteEnrollmentDto {
  @ApiPropertyOptional({ description: 'Pontuação obtida' })
  @IsOptional()
  @IsNumber()
  score?: number;

  @ApiPropertyOptional({ description: 'URL do certificado' })
  @IsOptional()
  @IsString()
  certificateUrl?: string;
}
