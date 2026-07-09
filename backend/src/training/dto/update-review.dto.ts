import { IsOptional, IsInt, Min, Max, IsString } from 'class-validator';

export class UpdateReviewDto {
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
