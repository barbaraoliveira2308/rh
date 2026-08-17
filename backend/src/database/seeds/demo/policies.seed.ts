import { DataSource } from 'typeorm';
import { Policy } from '../../../policies/entities/policy.entity';
import { PolicyStatus } from '../../../policies/entities/policy-status.enum';
import { Employee } from '../../../users/entities/employee.entity';

const policies: {
  title: string;
  content: string;
  category: string;
  status: PolicyStatus;
  authorEmployeeNumber: string;
  tags: string[];
  published: boolean;
}[] = [
  {
    title: 'Política de Teletrabalho',
    content:
      'Esta política define as condições de trabalho remoto para todos os colaboradores da Bridge351, incluindo elegibilidade, equipamento fornecido pela empresa e horários de disponibilidade obrigatória.',
    category: 'RH',
    status: PolicyStatus.PUBLISHED,
    authorEmployeeNumber: 'EMP-004',
    tags: ['remoto', 'flexibilidade'],
    published: true,
  },
  {
    title: 'Código de Conduta',
    content:
      'O Código de Conduta estabelece os princípios éticos e de comportamento profissional esperados de todos os colaboradores, incluindo relações com clientes, confidencialidade e prevenção de conflitos de interesse.',
    category: 'Compliance',
    status: PolicyStatus.PUBLISHED,
    authorEmployeeNumber: 'EMP-004',
    tags: ['ética', 'conduta'],
    published: true,
  },
  {
    title: 'Política de Despesas 2026 (rascunho)',
    content:
      'Rascunho da revisão anual da política de despesas — novos limites por categoria e processo de submissão a validar antes de publicação.',
    category: 'Financeiro',
    status: PolicyStatus.DRAFT,
    authorEmployeeNumber: 'EMP-004',
    tags: ['despesas', 'financeiro'],
    published: false,
  },
];

export async function run(dataSource: DataSource): Promise<void> {
  const policyRepo = dataSource.getRepository(Policy);
  const employeeRepo = dataSource.getRepository(Employee);

  for (const seed of policies) {
    const existing = await policyRepo.findOneBy({ title: seed.title });
    if (existing) continue;

    const author = await employeeRepo.findOneBy({ employeeNumber: seed.authorEmployeeNumber });

    await policyRepo.save(
      policyRepo.create({
        title: seed.title,
        content: seed.content,
        category: seed.category,
        status: seed.status,
        authorId: author?.id ?? null,
        publishedAt: seed.published ? new Date() : null,
        version: 1,
        tags: seed.tags,
      }),
    );
  }
}
