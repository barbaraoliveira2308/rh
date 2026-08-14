import { IsString, IsInt, IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSystemSettingsDto {
  @ApiPropertyOptional({ description: 'Nome da empresa' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ description: 'País por defeito (ISO 3166-1 alpha-2)' })
  @IsOptional()
  @IsString()
  defaultCountry?: string;

  @ApiPropertyOptional({ description: 'Moeda por defeito (ISO 4217)' })
  @IsOptional()
  @IsString()
  defaultCurrency?: string;

  @ApiPropertyOptional({ description: 'Dias de férias por defeito/ano' })
  @IsOptional()
  @IsInt()
  @Min(0)
  defaultVacationDaysPerYear?: number;

  @ApiPropertyOptional({ description: 'Dias transitáveis para o próximo ano' })
  @IsOptional()
  @IsInt()
  @Min(0)
  carryOverVacationDays?: number;

  @ApiPropertyOptional({ description: 'Prazo de submissão de timesheets (dia do mês seguinte)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  timesheetSubmissionDeadlineDay?: number;

  @ApiPropertyOptional({ description: 'Horas diárias por defeito' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultDailyHours?: number;

  @ApiPropertyOptional({ description: 'Dias antes para alertar fim de contrato' })
  @IsOptional()
  @IsInt()
  @Min(0)
  contractExpiryAlertDays?: number;

  @ApiPropertyOptional({ description: 'Dias antes para alertar fim de projeto' })
  @IsOptional()
  @IsInt()
  @Min(0)
  projectEndAlertDays?: number;

  @ApiPropertyOptional({ description: 'Threshold de sub-alocação (%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  underallocationThresholdPercentage?: number;

  @ApiPropertyOptional({ description: 'Timeout de sessão (minutos)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  sessionTimeoutMinutes?: number;

  @ApiPropertyOptional({ description: 'Tentativas de login antes de bloqueio' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxLoginAttempts?: number;

  @ApiPropertyOptional({ description: 'Período de bloqueio (minutos)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  lockoutPeriodMinutes?: number;

  @ApiPropertyOptional({ description: 'MFA obrigatório para Admin' })
  @IsOptional()
  @IsBoolean()
  mfaRequiredForAdmin?: boolean;

  @ApiPropertyOptional({ description: 'Período de retenção pós-saída para GDPR (anos)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  gdprPostExitRetentionYears?: number;

  @ApiPropertyOptional({ description: 'Retenção na lixeira de documentos (dias)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  documentsTrashRetentionDays?: number;
}
