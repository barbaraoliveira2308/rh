import { IsString, IsOptional, IsInt, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketPriority } from '../entities/ticket-priority.enum';

export class CreateTicketCategoryDto {
  @ApiProperty({ description: 'Nome da categoria' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Prioridade padrão', enum: TicketPriority })
  @IsOptional()
  @IsEnum(TicketPriority)
  defaultPriority?: TicketPriority;

  @ApiProperty({ description: 'SLA em horas' })
  @IsInt()
  slaHours: number;

  @ApiPropertyOptional({ description: 'ID da equipa de resolução' })
  @IsOptional()
  @IsUUID()
  resolutionTeamId?: string;
}
