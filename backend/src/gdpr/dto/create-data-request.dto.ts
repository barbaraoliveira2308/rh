import { IsEnum, IsUUID, IsOptional, IsString } from 'class-validator';
import { DataSubjectRequestType } from '../entities/data-subject-request-type.enum';

export class CreateDataRequestDto {
  @IsUUID()
  subjectId: string;

  @IsEnum(DataSubjectRequestType)
  requestType: DataSubjectRequestType;

  @IsOptional()
  @IsString()
  notes?: string;
}
