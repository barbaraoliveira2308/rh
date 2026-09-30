import { IsString, IsEmail, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ description: 'Email do utilizador' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ description: 'Username do utilizador' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  username: string;

  @ApiProperty({
    description:
      'Password (mín. 10 caracteres, maiúsculas, minúsculas, números, caracter especial)',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).+$/, {
    message: 'Password deve conter maiúsculas, minúsculas, números e caracter especial',
  })
  password: string;
}
