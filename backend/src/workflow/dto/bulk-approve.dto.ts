import { ArrayMinSize, IsArray, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BulkApproveDto {
  @ApiProperty({ description: 'IDs dos itens da caixa de entrada a aprovar', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  ids: string[];

  @ApiPropertyOptional({ description: 'Motivo da aprovação em massa' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class BulkApproveResultItemDto {
  @ApiProperty({ description: 'ID do item de workflow' })
  id: string;

  @ApiProperty({ description: 'Se a aprovação deste item teve sucesso' })
  success: boolean;

  @ApiPropertyOptional({ description: 'Motivo da falha, quando success é false' })
  error?: string;
}

export class BulkApproveResultDto {
  @ApiProperty({ type: [BulkApproveResultItemDto] })
  results: BulkApproveResultItemDto[];
}
