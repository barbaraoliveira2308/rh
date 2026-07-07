import { IsString, IsOptional, IsUUID, IsNumber, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateJobTitleDto {
  @ApiPropertyOptional({ description: 'Nome do cargo' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Nível (Junior, Mid, Senior, Lead)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  level?: string;

  @ApiPropertyOptional({ description: 'ID do departamento' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Tarifário por hora' })
  @IsOptional()
  @IsNumber()
  hourlyRate?: number;

  @ApiPropertyOptional({ description: 'Ativo' })
  @IsOptional()
  isActive?: boolean;
}
