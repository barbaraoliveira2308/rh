import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRetentionPolicyDto {
  @ApiProperty({ description: 'Ativar/desativar a política' })
  @IsBoolean()
  isActive: boolean;
}
