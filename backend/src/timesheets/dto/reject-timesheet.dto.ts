import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectTimesheetDto {
  @ApiProperty({ description: 'Motivo da rejeição' })
  @IsString()
  reason: string;
}
