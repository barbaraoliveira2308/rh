import { IsOptional, IsString } from 'class-validator';

export class CompleteRequestDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
