import { IsString, IsInt, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RetentionAction } from '../entities/retention-action.enum';

export class CreateRetentionPolicyDto {
  @ApiProperty({ description: 'Categoria de dados' })
  @IsString()
  dataCategory: string;

  @ApiProperty({ description: 'Anos de retenção' })
  @IsInt()
  retentionYears: number;

  @ApiPropertyOptional({ description: 'Referência legal' })
  @IsOptional()
  @IsString()
  legalReference?: string;

  @ApiProperty({ description: 'Ação após retenção', enum: RetentionAction })
  @IsEnum(RetentionAction)
  actionAfterRetention: RetentionAction;

  @ApiPropertyOptional({ description: 'Ativo' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
