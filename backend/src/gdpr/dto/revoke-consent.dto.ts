import { IsString, IsUUID } from 'class-validator';

export class RevokeConsentDto {
  @IsUUID()
  subjectId: string;

  @IsString()
  purpose: string;
}
