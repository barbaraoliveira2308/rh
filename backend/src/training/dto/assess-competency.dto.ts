import { IsUUID, IsInt, Min, Max, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssessCompetencyDto {
  @ApiProperty({ description: 'ID da competência' })
  @IsUUID()
  competencyId: string;

  @ApiProperty({ description: 'Nível (1-5)', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  level: number;

  @ApiPropertyOptional({ description: 'Data de avaliação (default: hoje)' })
  @IsOptional()
  @IsDateString()
  assessedAt?: string;
}
