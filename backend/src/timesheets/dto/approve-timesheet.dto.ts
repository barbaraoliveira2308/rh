import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveTimesheetDto {
  @ApiPropertyOptional({ description: 'Comentário da aprovação' })
  @IsOptional()
  @IsString()
  comment?: string;
}
