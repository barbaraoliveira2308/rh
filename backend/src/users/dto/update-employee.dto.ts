import {
  IsString,
  IsEmail,
  IsOptional,
  IsUUID,
  IsDateString,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EmployeeStatus } from '../entities/employee.entity';

export class UpdateEmployeeDto {
  @ApiPropertyOptional({ description: 'Número interno do colaborador' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  employeeNumber?: string;

  @ApiPropertyOptional({ description: 'Primeiro nome' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ description: 'Último nome' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ description: 'Email profissional' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ description: 'Email pessoal' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  personalEmail?: string;

  @ApiPropertyOptional({ description: 'Telefone' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ description: 'NIF' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  nif?: string;

  @ApiPropertyOptional({ description: 'Data de nascimento' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ description: 'Morada' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Nacionalidade' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nationality?: string;

  @ApiPropertyOptional({ description: 'Género' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  gender?: string;

  @ApiPropertyOptional({ description: 'URL da fotografia' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  photoUrl?: string;

  @ApiPropertyOptional({ description: 'ID do departamento' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'ID do cargo' })
  @IsOptional()
  @IsUUID()
  jobTitleId?: string;

  @ApiPropertyOptional({ description: 'ID do gestor' })
  @IsOptional()
  @IsUUID()
  managerId?: string;

  @ApiPropertyOptional({ description: 'Data de início' })
  @IsOptional()
  @IsDateString()
  employmentStartDate?: string;

  @ApiPropertyOptional({ description: 'Data de saída' })
  @IsOptional()
  @IsDateString()
  employmentEndDate?: string;

  @ApiPropertyOptional({ description: 'Estado', enum: EmployeeStatus })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @ApiPropertyOptional({ description: 'Local de trabalho' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  workLocation?: string;

  @ApiPropertyOptional({ description: 'IBAN' })
  @IsOptional()
  @IsString()
  @MaxLength(34)
  iban?: string;
}
