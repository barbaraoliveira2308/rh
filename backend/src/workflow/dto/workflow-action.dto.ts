import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class WorkflowActionDto {
  @ApiPropertyOptional({ description: 'Motivo da acção' })
  @IsOptional()
  @IsString()
  reason?: string;
}
