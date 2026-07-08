import { IsString, IsDateString, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { BlockedPeriodScope } from '../entities/blocked-period.entity';

export class CreateBlockedPeriodDto {
  @IsString()
  @MaxLength(200)
  reason: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsEnum(BlockedPeriodScope)
  @IsOptional()
  scope?: BlockedPeriodScope;
}
