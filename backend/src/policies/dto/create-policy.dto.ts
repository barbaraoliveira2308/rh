import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreatePolicyDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsString()
  category: string;

  @IsOptional()
  @IsArray()
  tags?: string[];
}
