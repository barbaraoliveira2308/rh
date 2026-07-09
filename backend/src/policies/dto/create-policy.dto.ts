import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePolicyDto {
  @ApiProperty({ description: 'Título da política' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Conteúdo' })
  @IsString()
  content: string;

  @ApiProperty({ description: 'Categoria' })
  @IsString()
  category: string;

  @ApiPropertyOptional({ description: 'Tags' })
  @IsOptional()
  @IsArray()
  tags?: string[];
}
