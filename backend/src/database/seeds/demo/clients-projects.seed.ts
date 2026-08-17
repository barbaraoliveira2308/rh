import { DataSource } from 'typeorm';
import { Client, ClientStatus } from '../../../clients/entities/client.entity';
import { Project, ProjectStatus } from '../../../projects/entities/project.entity';
import {
  ProjectAllocation,
  AllocationType,
} from '../../../projects/entities/project-allocation.entity';
import { Employee } from '../../../users/entities/employee.entity';

const clients = [
  {
    name: 'Aurora Tech',
    nif: '509123456',
    contactName: 'Helena Vaz',
    email: 'helena.vaz@auroratech.example',
    phone: '+351 210 000 001',
    responsibleEmployeeNumber: 'EMP-001',
  },
  {
    name: 'Vertex Solutions',
    nif: '509654321',
    contactName: 'Pedro Bastos',
    email: 'pedro.bastos@vertexsolutions.example',
    phone: '+351 220 000 002',
    responsibleEmployeeNumber: 'EMP-002',
  },
  {
    name: 'Solstice Retail',
    nif: '509789123',
    contactName: 'Inês Duarte',
    email: 'ines.duarte@solsticeretail.example',
    phone: '+351 230 000 003',
    responsibleEmployeeNumber: 'EMP-001',
  },
];

const projects: {
  name: string;
  code: string;
  clientName: string;
  managerEmployeeNumber: string;
  status: ProjectStatus;
  startDate: string;
  endDate: string | null;
  hourlyRate: number;
  budget: number;
  allocations: {
    employeeNumber: string;
    value: number;
    startDate: string;
    endDate: string | null;
  }[];
}[] = [
  {
    name: 'Plataforma Aurora',
    code: 'AUR-2026',
    clientName: 'Aurora Tech',
    managerEmployeeNumber: 'EMP-001',
    status: ProjectStatus.ACTIVE,
    startDate: '2026-02-01',
    endDate: null,
    hourlyRate: 65,
    budget: 250000,
    allocations: [
      { employeeNumber: 'EMP-005', value: 80, startDate: '2026-02-01', endDate: null },
      { employeeNumber: 'EMP-006', value: 60, startDate: '2026-03-01', endDate: null },
    ],
  },
  {
    name: 'Migração Vertex',
    code: 'VTX-2026',
    clientName: 'Vertex Solutions',
    managerEmployeeNumber: 'EMP-002',
    status: ProjectStatus.ACTIVE,
    startDate: '2026-04-01',
    endDate: null,
    hourlyRate: 60,
    budget: 120000,
    allocations: [
      { employeeNumber: 'EMP-007', value: 100, startDate: '2026-04-01', endDate: null },
    ],
  },
  {
    name: 'Portal Solstice',
    code: 'SOL-2025',
    clientName: 'Solstice Retail',
    managerEmployeeNumber: 'EMP-001',
    status: ProjectStatus.CLOSED,
    startDate: '2025-06-01',
    endDate: '2026-01-31',
    hourlyRate: 55,
    budget: 80000,
    allocations: [],
  },
];

export async function run(dataSource: DataSource): Promise<void> {
  const clientRepo = dataSource.getRepository(Client);
  const projectRepo = dataSource.getRepository(Project);
  const allocationRepo = dataSource.getRepository(ProjectAllocation);
  const employeeRepo = dataSource.getRepository(Employee);

  const clientByName = new Map<string, Client>();

  for (const seed of clients) {
    let client = await clientRepo.findOneBy({ name: seed.name });

    if (!client) {
      const responsible = await employeeRepo.findOneBy({
        employeeNumber: seed.responsibleEmployeeNumber,
      });

      client = await clientRepo.save(
        clientRepo.create({
          name: seed.name,
          nif: seed.nif,
          contactName: seed.contactName,
          email: seed.email,
          phone: seed.phone,
          responsibleId: responsible?.id ?? null,
          status: ClientStatus.ACTIVE,
        }),
      );
    }

    clientByName.set(seed.name, client);
  }

  for (const seed of projects) {
    let project = await projectRepo.findOneBy({ code: seed.code });

    if (!project) {
      const client = clientByName.get(seed.clientName);
      const manager = await employeeRepo.findOneBy({
        employeeNumber: seed.managerEmployeeNumber,
      });

      project = await projectRepo.save(
        projectRepo.create({
          name: seed.name,
          code: seed.code,
          clientId: client?.id ?? '',
          managerId: manager?.id ?? '',
          status: seed.status,
          startDate: seed.startDate,
          endDate: seed.endDate,
          hourlyRate: seed.hourlyRate,
          budget: seed.budget,
        }),
      );
    }

    for (const allocationSeed of seed.allocations) {
      const employee = await employeeRepo.findOneBy({
        employeeNumber: allocationSeed.employeeNumber,
      });
      if (!employee) continue;

      const existing = await allocationRepo.findOneBy({
        projectId: project.id,
        employeeId: employee.id,
      });
      if (existing) continue;

      await allocationRepo.save(
        allocationRepo.create({
          projectId: project.id,
          employeeId: employee.id,
          allocationType: AllocationType.PERCENTAGE,
          allocationValue: allocationSeed.value,
          startDate: allocationSeed.startDate,
          endDate: allocationSeed.endDate,
          roleInProject: 'Consultor',
        }),
      );
    }
  }
}
