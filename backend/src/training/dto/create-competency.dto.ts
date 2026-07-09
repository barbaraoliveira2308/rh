import { IsString, IsOptional } from 'class-validator';

export class CreateCompetencyDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
