import { IsString, IsOptional, IsUUID, IsNumber, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateJobTitleDto {
  @ApiProperty({ description: 'Nome do cargo' })
  @IsString()
  @MaxLength(100)
  name: string;

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
}
