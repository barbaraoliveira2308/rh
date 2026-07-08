import { ArrayNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkApproveDto {
  @ApiProperty({ description: 'IDs das folhas de horas a aprovar', type: [String] })
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  ids: string[];
}
