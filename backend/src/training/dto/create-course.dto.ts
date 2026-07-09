import { IsString, IsOptional, IsBoolean, IsNumber, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CourseStatus } from '../entities/course-status.enum';

export class CreateCourseDto {
  @ApiProperty({ description: 'Nome do curso' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Descrição' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Entidade formadora' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ description: 'Duração em horas' })
  @IsOptional()
  @IsNumber()
  durationHours?: number;

  @ApiPropertyOptional({ description: 'Obrigatório' })
  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;

  @ApiPropertyOptional({ description: 'Categoria' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Data de início' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Data de fim' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Estado', enum: CourseStatus })
  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  @ApiPropertyOptional({ description: 'ID do curso pré-requisito' })
  @IsOptional()
  @IsUUID()
  prerequisiteCourseId?: string;
}
