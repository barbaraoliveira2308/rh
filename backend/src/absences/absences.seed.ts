import { DataSource } from 'typeorm';
import { AbsenceType } from './entities/absence-type.entity';

const defaultAbsenceTypes = [
  {
    name: 'Férias',
    code: 'VACATION',
    limitPerYear: 22,
    requiresDocument: false,
    isPaid: true,
    affectsBalance: true,
    color: '#4CAF50',
    isSystem: true,
  },
  {
    name: 'Baixa Médica',
    code: 'SICK',
    limitPerYear: null,
    requiresDocument: true,
    isPaid: true,
    affectsBalance: true,
    color: '#F44336',
    isSystem: true,
  },
  {
    name: 'Falecimento',
    code: 'BEREAVEMENT',
    limitPerYear: 5,
    requiresDocument: true,
    isPaid: true,
    affectsBalance: false,
    color: '#9E9E9E',
    isSystem: true,
  },
  {
    name: 'Licença Parental',
    code: 'LEAVE',
    limitPerYear: null,
    requiresDocument: true,
    isPaid: true,
    affectsBalance: true,
    color: '#E91E63',
    isSystem: true,
  },
  {
    name: 'Casamento',
    code: 'MARRIAGE',
    limitPerYear: 15,
    requiresDocument: true,
    isPaid: true,
    affectsBalance: false,
    color: '#FF9800',
    isSystem: true,
  },
  {
    name: 'Consulta Médica',
    code: 'MEDICAL_APPT',
    limitPerYear: null,
    requiresDocument: true,
    isPaid: true,
    affectsBalance: false,
    color: '#2196F3',
    isSystem: true,
  },
  {
    name: 'Formação',
    code: 'TRAINING',
    limitPerYear: null,
    requiresDocument: false,
    isPaid: true,
    affectsBalance: false,
    color: '#3F51B5',
    isSystem: true,
  },
  {
    name: 'Dia Oferecido',
    code: 'GIFT_DAY',
    limitPerYear: 1,
    requiresDocument: false,
    isPaid: true,
    affectsBalance: false,
    color: '#00BCD4',
    isSystem: true,
  },
  {
    name: 'Assistência à Família',
    code: 'FAMILY',
    limitPerYear: null,
    requiresDocument: false,
    isPaid: true,
    affectsBalance: false,
    color: '#009688',
    isSystem: true,
  },
  {
    name: 'Outro',
    code: 'OTHER',
    limitPerYear: null,
    requiresDocument: false,
    isPaid: true,
    affectsBalance: false,
    color: '#607D8B',
    isSystem: false,
  },
];

export async function runAbsenceTypesSeed(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(AbsenceType);

  for (const type of defaultAbsenceTypes) {
    const exists = await repo.findOne({ where: { code: type.code } });
    if (!exists) {
      await repo.save(repo.create(type));
    }
  }
}
