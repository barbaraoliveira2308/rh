import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveAbsenceDto {
  @ApiPropertyOptional({ description: 'Comentário' })
  @IsOptional()
  @IsString()
  comments?: string;
}
