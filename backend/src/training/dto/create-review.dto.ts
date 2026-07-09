import { IsString, IsUUID, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ description: 'ID do colaborador' })
  @IsUUID()
  employeeId: string;

  @ApiProperty({ description: 'Período da avaliação (ex: 2026-H1)' })
  @IsString()
  period: string;

  @ApiPropertyOptional({ description: 'Classificação geral (1-5)', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  overallRating?: number;

  @ApiPropertyOptional({ description: 'Classificação de potencial (1-5)', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  potentialRating?: number;

  @ApiPropertyOptional({ description: 'Pontos fortes' })
  @IsOptional()
  @IsString()
  strengths?: string;

  @ApiPropertyOptional({ description: 'Áreas de melhoria' })
  @IsOptional()
  @IsString()
  improvementAreas?: string;

  @ApiPropertyOptional({ description: 'Objectivos para o próximo período' })
  @IsOptional()
  @IsString()
  objectivesNext?: string;
}
