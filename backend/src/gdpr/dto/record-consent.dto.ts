import { IsString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LegalBasis } from '../entities/legal-basis.enum';

export class RecordConsentDto {
  @ApiProperty({ description: 'ID do titular' })
  @IsUUID()
  subjectId: string;

  @ApiProperty({ description: 'Finalidade do consentimento' })
  @IsString()
  purpose: string;

  @ApiProperty({ description: 'Base legal', enum: LegalBasis })
  @IsEnum(LegalBasis)
  legalBasis: LegalBasis;

  @ApiPropertyOptional({ description: 'Versão do consentimento' })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({ description: 'Quem recolheu o consentimento' })
  @IsOptional()
  @IsString()
  collectedBy?: string;
}
