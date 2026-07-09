import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class AddCommentDto {
  @IsString()
  text: string;

  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}
