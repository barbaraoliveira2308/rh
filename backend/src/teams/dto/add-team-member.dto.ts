import { IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddTeamMemberDto {
  @ApiProperty({ description: 'ID do colaborador' })
  @IsUUID()
  employeeId: string;

  @ApiProperty({ description: 'Função na equipa' })
  @IsString()
  @MaxLength(100)
  role: string;
}
