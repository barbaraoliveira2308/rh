import { IsString, IsOptional, IsUUID, IsObject, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAuditLogDto {
  @ApiPropertyOptional({ description: 'ID do utilizador (null para processos automáticos)' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({ description: 'Ação executada (ex: employee.update)' })
  @IsString()
  @MaxLength(100)
  action: string;

  @ApiProperty({ description: 'Tipo de entidade (ex: Employee)' })
  @IsString()
  @MaxLength(100)
  entityType: string;

  @ApiProperty({ description: 'ID da entidade' })
  @IsUUID()
  entityId: string;

  @ApiPropertyOptional({ description: 'Estado anterior' })
  @IsOptional()
  @IsObject()
  oldValues?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Estado novo' })
  @IsOptional()
  @IsObject()
  newValues?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Endereço IP' })
  @IsOptional()
  @IsString()
  @MaxLength(45)
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'User-Agent' })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiProperty({ description: 'Módulo de origem' })
  @IsString()
  @MaxLength(50)
  module: string;

  @ApiPropertyOptional({ description: 'ID de correlação para agrupar operações' })
  @IsOptional()
  @IsUUID()
  correlationId?: string;
}
