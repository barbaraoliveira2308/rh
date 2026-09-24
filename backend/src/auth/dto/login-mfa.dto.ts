import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginMfaDto {
  @ApiProperty({ description: 'Token de desafio devolvido por POST /auth/login' })
  @IsString()
  @Length(64, 64)
  challengeToken: string;

  @ApiProperty({ description: 'Código TOTP de 6 dígitos ou código de recuperação' })
  @IsString()
  @Length(6, 20)
  code: string;
}
