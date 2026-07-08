import { IsString, IsOptional, IsUUID, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentCategory } from '../entities/document.entity';

export class UploadDocumentDto {
  @ApiProperty({ description: 'Nome do documento' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Categoria', enum: DocumentCategory })
  @IsEnum(DocumentCategory)
  category: DocumentCategory;

  @ApiPropertyOptional({ description: 'ID do proprietário (colaborador)' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({ description: 'Público?', default: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'É template?', default: false })
  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;
}
