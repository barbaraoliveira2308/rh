import { IsUUID } from 'class-validator';

export class EnrollEmployeeDto {
  @IsUUID()
  employeeId: string;
}
