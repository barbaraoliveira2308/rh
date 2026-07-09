import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RevokeConsentDto {
  @ApiProperty({ description: 'ID do titular' })
  @IsUUID()
  subjectId: string;

  @ApiProperty({ description: 'Finalidade do consentimento a revogar' })
  @IsString()
  purpose: string;
}
