import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCompetencyDto {
  @ApiProperty({ description: 'Nome da competência' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Categoria' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Descrição' })
  @IsOptional()
  @IsString()
  description?: string;
}
