import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: 'Email do utilizador' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'Nome de utilizador (derivado do email se omitido)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  username?: string;
}
