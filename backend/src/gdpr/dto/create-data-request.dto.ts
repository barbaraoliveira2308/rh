import { IsEnum, IsUUID, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DataSubjectRequestType } from '../entities/data-subject-request-type.enum';

export class CreateDataRequestDto {
  @ApiProperty({ description: 'ID do titular dos dados' })
  @IsUUID()
  subjectId: string;

  @ApiProperty({ description: 'Tipo de pedido', enum: DataSubjectRequestType })
  @IsEnum(DataSubjectRequestType)
  requestType: DataSubjectRequestType;

  @ApiPropertyOptional({ description: 'Notas adicionais' })
  @IsOptional()
  @IsString()
  notes?: string;
}
