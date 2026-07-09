import { IsString, IsOptional, IsInt, IsEnum, IsUUID } from 'class-validator';
import { TicketPriority } from '../entities/ticket-priority.enum';

export class CreateTicketCategoryDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(TicketPriority)
  defaultPriority?: TicketPriority;

  @IsInt()
  slaHours: number;

  @IsOptional()
  @IsUUID()
  resolutionTeamId?: string;
}
