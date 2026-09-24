import { IsString, MinLength, MaxLength } from 'class-validator';
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
}
