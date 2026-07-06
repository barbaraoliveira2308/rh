import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Email do utilizador para recuperação de password' })
  @IsEmail()
  email: string;
}
