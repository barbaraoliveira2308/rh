import {
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AnnouncementAssetType } from '../entities/announcement-asset.entity';
import { AnnouncementStatus } from '../entities/announcement.entity';

export class CreateAnnouncementDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsArray()
  bodyBlocks?: Record<string, unknown>[];

  @IsOptional()
  @IsArray()
  forms?: { title: string; fields: Record<string, unknown>[] }[];
}

export class UpdateAnnouncementDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsArray()
  bodyBlocks?: Record<string, unknown>[];
}

export class CreateAnnouncementAssetDto {
  @IsIn(Object.values(AnnouncementAssetType))
  assetType: AnnouncementAssetType;

  @IsUrl()
  @MaxLength(512)
  url: string;
}

export class CreateAnnouncementFormResponseDto {
  @IsObject()
  answers: Record<string, unknown>;
}

export class AnnouncementQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsIn(Object.values(AnnouncementStatus))
  status?: AnnouncementStatus;
}
