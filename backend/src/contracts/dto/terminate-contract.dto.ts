import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TerminateContractDto {
  @ApiProperty({ description: 'Motivo da rescisão' })
  @IsString()
  @MinLength(1)
  reason: string;
}
