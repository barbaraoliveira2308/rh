import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: 'Email do utilizador' })
  @IsString()
  @MaxLength(255)
  email: string;

  @ApiProperty({ description: 'Password do utilizador' })
  @IsString()
  @MinLength(1)
  password: string;

  @ApiProperty({ description: 'Código TOTP (obrigatório se MFA ativo)', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(6)
  mfaCode?: string;
}
