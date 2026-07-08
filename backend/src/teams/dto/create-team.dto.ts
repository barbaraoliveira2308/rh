import { IsString, IsOptional, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTeamDto {
  @ApiProperty({ description: 'Nome da equipa' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'ID do departamento' })
  @IsUUID()
  departmentId: string;

  @ApiPropertyOptional({ description: 'ID do líder da equipa' })
  @IsOptional()
  @IsUUID()
  leaderId?: string;

  @ApiPropertyOptional({ description: 'Descrição' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Ativa', default: true })
  @IsOptional()
  isActive?: boolean;
}
