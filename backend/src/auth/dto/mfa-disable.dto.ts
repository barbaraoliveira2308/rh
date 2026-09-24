import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MfaDisableDto {
  @ApiProperty({
    description: 'Código TOTP (6 dígitos) ou código de recuperação para confirmar a desativação',
  })
  @IsString()
  @Length(6, 20)
  code: string;
}
