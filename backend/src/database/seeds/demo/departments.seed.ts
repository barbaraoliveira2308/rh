import { DataSource } from 'typeorm';
import { Department } from '../../../users/entities/department.entity';
import { JobTitle } from '../../../users/entities/job-title.entity';

const departments = [
  { name: 'Engenharia', code: 'ENG', description: 'Desenvolvimento de software e plataformas' },
  { name: 'Consultoria', code: 'CNS', description: 'Consultoria e implementação para clientes' },
  { name: 'Comercial', code: 'COM', description: 'Gestão de contas e novos negócios' },
  { name: 'Recursos Humanos', code: 'RH', description: 'Gestão de pessoas e talento' },
];

const jobTitles: { name: string; level: string; departmentCode: string; hourlyRate: number }[] = [
  { name: 'Head of Engineering', level: 'Senior', departmentCode: 'ENG', hourlyRate: 55 },
  { name: 'Software Engineer', level: 'Mid', departmentCode: 'ENG', hourlyRate: 40 },
  { name: 'Head of Consulting', level: 'Senior', departmentCode: 'CNS', hourlyRate: 55 },
  { name: 'Consultant', level: 'Mid', departmentCode: 'CNS', hourlyRate: 38 },
  { name: 'Account Director', level: 'Senior', departmentCode: 'COM', hourlyRate: 50 },
  { name: 'HR Lead', level: 'Senior', departmentCode: 'RH', hourlyRate: 45 },
];

export async function run(dataSource: DataSource): Promise<void> {
  const departmentRepo = dataSource.getRepository(Department);
  const jobTitleRepo = dataSource.getRepository(JobTitle);

  const departmentByCode = new Map<string, Department>();

  for (const dept of departments) {
    let entity = await departmentRepo.findOneBy({ name: dept.name });
    entity ??= await departmentRepo.save(departmentRepo.create(dept));
    departmentByCode.set(dept.code, entity);
  }

  for (const title of jobTitles) {
    const existing = await jobTitleRepo.findOneBy({ name: title.name });
    if (existing) continue;

    const department = departmentByCode.get(title.departmentCode);
    await jobTitleRepo.save(
      jobTitleRepo.create({
        name: title.name,
        level: title.level,
        departmentId: department?.id ?? null,
        hourlyRate: title.hourlyRate,
      }),
    );
  }
}
