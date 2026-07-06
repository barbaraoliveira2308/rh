import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MfaDisableDto {
  @ApiProperty({ description: 'Código TOTP para confirmar desativação do MFA' })
  @IsString()
  @Length(6, 6)
  code: string;
}
