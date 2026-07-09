import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EnrollEmployeeDto {
  @ApiProperty({ description: 'ID do colaborador' })
  @IsUUID()
  employeeId: string;
}
