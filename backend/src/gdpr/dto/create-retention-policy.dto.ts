import { IsString, IsInt, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { RetentionAction } from '../entities/retention-action.enum';

export class CreateRetentionPolicyDto {
  @IsString()
  dataCategory: string;

  @IsInt()
  retentionYears: number;

  @IsOptional()
  @IsString()
  legalReference?: string;

  @IsEnum(RetentionAction)
  actionAfterRetention: RetentionAction;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
