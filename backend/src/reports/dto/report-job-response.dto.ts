import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReportJobResponseDto {
  @ApiProperty({ description: 'ID do job' })
  id: string;

  @ApiProperty({ description: 'Tipo de relatório' })
  reportType: string;

  @ApiProperty({ description: 'Formato' })
  format: string;

  @ApiProperty({ description: 'Estado do job' })
  status: string;

  @ApiPropertyOptional({ description: 'URL do resultado' })
  resultUrl: string | null;

  @ApiPropertyOptional({ description: 'Mensagem de erro' })
  errorMessage: string | null;

  @ApiPropertyOptional({ description: 'Número de linhas' })
  rowCount: number | null;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiPropertyOptional({ description: 'Data de conclusão' })
  completedAt: Date | null;
}
