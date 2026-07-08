import { IsString, IsDateString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class CreatePublicHolidayDto {
  @IsString()
  @MaxLength(5)
  countryCode: string;

  @IsDateString()
  holidayDate: string;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  localName?: string;

  @IsBoolean()
  @IsOptional()
  global?: boolean;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  region?: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  type?: string;
}
