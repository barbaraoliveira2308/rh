import { IsUUID, IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePreferenceDto {
  @ApiPropertyOptional({ description: 'ID da preferência' })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiPropertyOptional({ description: 'Tipo de notificação' })
  @IsOptional()
  @IsString()
  notificationType?: string;

  @ApiPropertyOptional({ description: 'Ativar email' })
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Ativar in-app' })
  @IsOptional()
  @IsBoolean()
  inAppEnabled?: boolean;
}
