import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MfaVerifyDto {
  @ApiProperty({ description: 'Código TOTP de 6 dígitos' })
  @IsString()
  @Length(6, 6)
  code: string;
}
