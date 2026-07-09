import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddCommentDto {
  @ApiProperty({ description: 'Texto do comentário' })
  @IsString()
  text: string;

  @ApiPropertyOptional({ description: 'Comentário interno (visível apenas a agentes)' })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}
