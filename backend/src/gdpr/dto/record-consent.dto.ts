import { IsString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { LegalBasis } from '../entities/legal-basis.enum';

export class RecordConsentDto {
  @IsUUID()
  subjectId: string;

  @IsString()
  purpose: string;

  @IsEnum(LegalBasis)
  legalBasis: LegalBasis;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsString()
  collectedBy?: string;
}
