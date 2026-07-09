import { IsString, IsDateString, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BlockedPeriodScope } from '../entities/blocked-period.entity';

export class CreateBlockedPeriodDto {
  @ApiProperty({ description: 'Motivo do bloqueio', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  reason: string;

  @ApiProperty({ description: 'Data de início' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Data de fim' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'Âmbito', enum: BlockedPeriodScope })
  @IsEnum(BlockedPeriodScope)
  @IsOptional()
  scope?: BlockedPeriodScope;
}
