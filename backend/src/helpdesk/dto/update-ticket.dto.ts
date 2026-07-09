import { IsOptional, IsString, IsUUID, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TicketPriority } from '../entities/ticket-priority.enum';
import { TicketStatus } from '../entities/ticket-status.enum';

export class UpdateTicketDto {
  @ApiPropertyOptional({ description: 'Título do ticket' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Descrição detalhada' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'ID da categoria' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'ID do responsável' })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({ description: 'ID da equipa' })
  @IsOptional()
  @IsUUID()
  teamId?: string;

  @ApiPropertyOptional({ description: 'Prioridade', enum: TicketPriority })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({ description: 'Estado', enum: TicketStatus })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;
}
