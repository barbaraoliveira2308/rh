import { IsOptional, IsNumber, IsString } from 'class-validator';

export class CompleteEnrollmentDto {
  @IsOptional()
  @IsNumber()
  score?: number;

  @IsOptional()
  @IsString()
  certificateUrl?: string;
}
