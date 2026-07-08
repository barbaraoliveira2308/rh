import { IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RenewContractDto {
  @ApiProperty({ description: 'Nova data de fim' })
  @IsDateString()
  newEndDate: string;
}
