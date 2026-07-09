import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignTicketDto {
  @ApiProperty({ description: 'ID do agente a quem atribuir o ticket' })
  @IsUUID()
  agentId: string;
}
