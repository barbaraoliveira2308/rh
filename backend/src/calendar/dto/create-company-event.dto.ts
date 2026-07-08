import { IsString, IsDateString, IsOptional, IsEnum, IsBoolean, MaxLength } from 'class-validator';
import { CompanyEventType } from '../entities/company-event.entity';

export class CreateCompanyEventDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsEnum(CompanyEventType)
  @IsOptional()
  type?: CompanyEventType;

  @IsString()
  @MaxLength(7)
  @IsOptional()
  color?: string;

  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;
}
