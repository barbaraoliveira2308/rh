import { IsString, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendInAppDto {
  @ApiProperty({ description: 'ID do destinatário' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Título da notificação' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Mensagem da notificação' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Link associado' })
  @IsOptional()
  @IsString()
  link?: string;
}
