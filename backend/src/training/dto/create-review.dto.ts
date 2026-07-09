import { IsString, IsUUID, IsOptional, IsInt, Min, Max } from 'class-validator';

export class CreateReviewDto {
  @IsUUID()
  employeeId: string;

  @IsString()
  period: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  overallRating?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  potentialRating?: number;

  @IsOptional()
  @IsString()
  strengths?: string;

  @IsOptional()
  @IsString()
  improvementAreas?: string;

  @IsOptional()
  @IsString()
  objectivesNext?: string;
}
