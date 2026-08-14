import { ApiProperty } from '@nestjs/swagger';
import { AllocationType } from '../../projects/entities/project-allocation.entity';
import { UnallocatedEmployeeDto } from '../../analytics/dto/analytics-response.dto';

export class CapacityOverviewEntryDto {
  @ApiProperty({ description: 'ID do colaborador' })
  employeeId: string;

  @ApiProperty({ description: 'Nome do colaborador' })
  employeeName: string;

  @ApiProperty({ description: 'Percentagem de alocação planeada, sem ajuste de ausências' })
  allocationPercentage: number;

  @ApiProperty({ description: 'Dias de ausência aprovada no período' })
  absenceDays: number;

  @ApiProperty({
    description:
      'Percentagem de alocação ajustada, descontando dias de ausência aprovada do denominador de capacidade (BR-CAP-004)',
  })
  adjustedAllocationPercentage: number;
}

export class CapacityAlertsDto {
  @ApiProperty({
    description: 'Colaboradores sobrealocados (>100%, valor ajustado)',
    type: [CapacityOverviewEntryDto],
  })
  overallocations: CapacityOverviewEntryDto[];

  @ApiProperty({
    description: 'Colaboradores sub-alocados (>0% e <80%, valor ajustado)',
    type: [CapacityOverviewEntryDto],
  })
  underallocations: CapacityOverviewEntryDto[];

  @ApiProperty({
    description: 'Colaboradores sem qualquer alocação (0%)',
    type: [UnallocatedEmployeeDto],
  })
  available: UnallocatedEmployeeDto[];
}

export class CapacityCalendarEntryDto {
  @ApiProperty({ description: 'ID do colaborador' })
  employeeId: string;

  @ApiProperty({ description: 'Nome do colaborador' })
  employeeName: string;

  @ApiProperty({ description: 'ID do projeto' })
  projectId: string;

  @ApiProperty({ description: 'Nome do projeto' })
  projectName: string;

  @ApiProperty({ description: 'Data de início da alocação' })
  startDate: string;

  @ApiProperty({ description: 'Data de fim da alocação', nullable: true })
  endDate: string | null;

  @ApiProperty({ description: 'Tipo de alocação', enum: AllocationType })
  allocationType: AllocationType;

  @ApiProperty({ description: 'Valor da alocação (percentagem ou horas, conforme allocationType)' })
  allocationValue: number;
}
