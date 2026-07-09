import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ScheduledReportResponseDto {
  @ApiProperty({ description: 'ID do agendamento' })
  id: string;

  @ApiProperty({ description: 'Nome' })
  name: string;

  @ApiProperty({ description: 'Tipo de relatório' })
  reportType: string;

  @ApiProperty({ description: 'Frequência' })
  frequency: string;

  @ApiProperty({ description: 'Destinatários' })
  recipients: string[];

  @ApiProperty({ description: 'Formato' })
  format: string;

  @ApiPropertyOptional({ description: 'Próxima execução' })
  nextRunAt: Date | null;

  @ApiPropertyOptional({ description: 'Última execução' })
  lastRunAt: Date | null;

  @ApiProperty({ description: 'Activo' })
  isActive: boolean;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;
}
