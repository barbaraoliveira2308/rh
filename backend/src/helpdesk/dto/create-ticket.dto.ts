import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTicketDto {
  @ApiProperty({ description: 'Título do ticket' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Descrição detalhada' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'ID da categoria' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'ID da equipa' })
  @IsOptional()
  @IsUUID()
  teamId?: string;
}
