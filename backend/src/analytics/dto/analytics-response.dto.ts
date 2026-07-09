import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TeamOccupancyDto {
  @ApiProperty({ description: 'ID do colaborador' })
  employeeId: string;

  @ApiProperty({ description: 'Nome do colaborador' })
  employeeName: string;

  @ApiProperty({ description: 'Percentagem de alocação' })
  allocationPercentage: number;
}

export class ProjectAllocationMapDto {
  @ApiProperty({ description: 'ID do projeto' })
  projectId: string;

  @ApiProperty({ description: 'Nome do projeto' })
  projectName: string;

  @ApiProperty({ description: 'Percentagem total de alocação' })
  totalAllocationPercentage: number;
}

export class UnallocatedEmployeeDto {
  @ApiProperty({ description: 'ID do colaborador' })
  employeeId: string;

  @ApiProperty({ description: 'Nome do colaborador' })
  employeeName: string;
}

export class CapacityForecastDto {
  @ApiProperty({ description: 'Mês (YYYY-MM)' })
  month: string;

  @ApiProperty({ description: 'Capacidade total' })
  totalCapacity: number;

  @ApiProperty({ description: 'Capacidade alocada' })
  allocatedCapacity: number;

  @ApiProperty({ description: 'Capacidade disponível' })
  availableCapacity: number;
}

export class ConsultantMarginDto {
  @ApiProperty({ description: 'ID do consultor' })
  employeeId: string;

  @ApiProperty({ description: 'Nome do consultor' })
  employeeName: string;

  @ApiProperty({ description: 'Período' })
  period: string;

  @ApiPropertyOptional({ description: 'Taxa horária' })
  hourlyRate: number | null;

  @ApiPropertyOptional({ description: 'Custo horário' })
  hourlyCost: number | null;

  @ApiProperty({ description: 'Horas trabalhadas' })
  hoursWorked: number;

  @ApiPropertyOptional({ description: 'Margem' })
  margin: number | null;
}

export class ProjectProfitabilityDto {
  @ApiProperty({ description: 'ID do projeto' })
  projectId: string;

  @ApiProperty({ description: 'Nome do projeto' })
  projectName: string;

  @ApiProperty({ description: 'Receita' })
  revenue: number;

  @ApiProperty({ description: 'Custo' })
  cost: number;

  @ApiProperty({ description: 'Margem' })
  margin: number;
}

export class MonthlyRevenueDto {
  @ApiProperty({ description: 'Mês (YYYY-MM)' })
  month: string;

  @ApiProperty({ description: 'ID do projeto' })
  projectId: string;

  @ApiProperty({ description: 'Nome do projeto' })
  projectName: string;

  @ApiProperty({ description: 'ID do cliente' })
  clientId: string;

  @ApiProperty({ description: 'Receita' })
  revenue: number;
}

export class TopPerformingProjectDto {
  @ApiProperty({ description: 'ID do projeto' })
  projectId: string;

  @ApiProperty({ description: 'Nome do projeto' })
  projectName: string;

  @ApiProperty({ description: 'Margem' })
  margin: number;

  @ApiProperty({ description: 'Receita' })
  revenue: number;

  @ApiProperty({ description: 'Custo' })
  cost: number;
}
