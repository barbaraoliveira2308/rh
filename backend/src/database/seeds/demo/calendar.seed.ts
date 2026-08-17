import { DataSource } from 'typeorm';
import { CompanyEvent, CompanyEventType } from '../../../calendar/entities/company-event.entity';
import { User } from '../../../auth/entities/user.entity';
import { Employee } from '../../../users/entities/employee.entity';

const events: {
  title: string;
  description: string;
  startDate: string;
  endDate: string | null;
  createdByEmployeeNumber: string | null;
}[] = [
  {
    title: 'Kickoff Anual Bridge351',
    description: 'Apresentação dos objetivos e resultados do ano para toda a empresa.',
    startDate: '2026-01-15',
    endDate: null,
    createdByEmployeeNumber: null,
  },
  {
    title: 'Team Building Engenharia',
    description: 'Atividade de team building para a equipa de Engenharia.',
    startDate: '2026-09-20',
    endDate: null,
    createdByEmployeeNumber: 'EMP-001',
  },
];

export async function run(dataSource: DataSource): Promise<void> {
  const eventRepo = dataSource.getRepository(CompanyEvent);
  const employeeRepo = dataSource.getRepository(Employee);
  const userRepo = dataSource.getRepository(User);

  const adminUser = await userRepo.findOneBy({ email: 'admin@hr-suite.local' });

  for (const seed of events) {
    const existing = await eventRepo.findOneBy({ title: seed.title });
    if (existing) continue;

    const creator = seed.createdByEmployeeNumber
      ? await employeeRepo.findOneBy({ employeeNumber: seed.createdByEmployeeNumber })
      : null;

    await eventRepo.save(
      eventRepo.create({
        title: seed.title,
        description: seed.description,
        startDate: seed.startDate,
        endDate: seed.endDate,
        type: CompanyEventType.COMPANY,
        createdBy: creator?.id ?? adminUser?.id ?? '',
      }),
    );
  }
}
