import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Password atual' })
  @IsString()
  oldPassword: string;

  @ApiProperty({ description: 'Nova password (mín. 10 caracteres, maiúsculas, minúsculas, números, caracter especial)' })
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).+$/,
    { message: 'Password deve conter maiúsculas, minúsculas, números e caracter especial' },
  )
  newPassword: string;
}
