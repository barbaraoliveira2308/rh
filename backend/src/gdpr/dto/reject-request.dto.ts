import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectRequestDto {
  @ApiProperty({ description: 'Motivo da rejeição' })
  @IsString()
  notes: string;
}
