import { DataSource } from 'typeorm';
import {
  Contract,
  ContractType,
  ContractStatus,
} from '../../../contracts/entities/contract.entity';
import { Employee } from '../../../users/entities/employee.entity';
import { LegalEntity } from '../../../admin/entities/legal-entity.entity';

const contracts: {
  employeeNumber: string;
  contractType: ContractType;
  startDate: string;
  endDate: string | null;
  monthlyCost: number;
}[] = [
  {
    employeeNumber: 'EMP-001',
    contractType: ContractType.PERMANENT,
    startDate: '2022-01-10',
    endDate: null,
    monthlyCost: 4200,
  },
  {
    employeeNumber: 'EMP-002',
    contractType: ContractType.PERMANENT,
    startDate: '2021-06-01',
    endDate: null,
    monthlyCost: 4200,
  },
  {
    employeeNumber: 'EMP-003',
    contractType: ContractType.PERMANENT,
    startDate: '2023-02-15',
    endDate: null,
    monthlyCost: 3800,
  },
  {
    employeeNumber: 'EMP-004',
    contractType: ContractType.PERMANENT,
    startDate: '2020-09-01',
    endDate: null,
    monthlyCost: 3200,
  },
  {
    employeeNumber: 'EMP-005',
    contractType: ContractType.PERMANENT,
    startDate: '2024-01-08',
    endDate: null,
    monthlyCost: 2800,
  },
  // Prazo a expirar em breve (~24 dias após a data "atual" da demo) para mostrar o alerta de expiração de contratos.
  {
    employeeNumber: 'EMP-006',
    contractType: ContractType.FIXED_TERM,
    startDate: '2025-03-01',
    endDate: '2026-09-10',
    monthlyCost: 2600,
  },
  {
    employeeNumber: 'EMP-007',
    contractType: ContractType.PERMANENT,
    startDate: '2025-08-01',
    endDate: null,
    monthlyCost: 2500,
  },
];

export async function run(dataSource: DataSource): Promise<void> {
  const contractRepo = dataSource.getRepository(Contract);
  const employeeRepo = dataSource.getRepository(Employee);
  const legalEntityRepo = dataSource.getRepository(LegalEntity);

  const bridge351 = await legalEntityRepo.findOneBy({ name: 'Bridge351' });

  for (const seed of contracts) {
    const employee = await employeeRepo.findOneBy({ employeeNumber: seed.employeeNumber });
    if (!employee) continue;

    const existing = await contractRepo.findOneBy({ employeeId: employee.id });
    if (existing) continue;

    await contractRepo.save(
      contractRepo.create({
        employeeId: employee.id,
        contractType: seed.contractType,
        status: ContractStatus.ACTIVE,
        startDate: seed.startDate,
        endDate: seed.endDate,
        monthlyCost: seed.monthlyCost,
        currency: 'EUR',
        contractingEntity: bridge351?.name ?? 'Bridge351',
        legalEntityId: bridge351?.id ?? null,
      }),
    );
  }
}
