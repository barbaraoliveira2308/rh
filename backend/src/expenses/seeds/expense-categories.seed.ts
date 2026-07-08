import { DataSource } from 'typeorm';
import { ExpenseCategory } from '../entities/expense-category.entity';

const defaultCategories: Partial<ExpenseCategory>[] = [
  { name: 'Alimentação', code: 'MEALS', limitAmount: 50, requiresReceipt: true },
  { name: 'Transporte', code: 'TRANSPORT', limitAmount: 100, requiresReceipt: false },
  { name: 'Alojamento', code: 'LODGING', limitAmount: 200, requiresReceipt: true },
  {
    name: 'Material de Escritório',
    code: 'OFFICE_SUPPLIES',
    limitAmount: 150,
    requiresReceipt: true,
  },
  { name: 'Tecnologia', code: 'TECHNOLOGY', limitAmount: 500, requiresReceipt: true },
  { name: 'Formação', code: 'TRAINING', limitAmount: 1000, requiresReceipt: true },
  { name: 'Entretenimento', code: 'ENTERTAINMENT', limitAmount: 100, requiresReceipt: true },
  { name: 'Outros', code: 'OTHER', limitAmount: null, requiresReceipt: false },
];

export async function run(dataSource: DataSource): Promise<void> {
  const categoryRepo = dataSource.getRepository(ExpenseCategory);
  const existingCount = await categoryRepo.count();

  if (existingCount > 0) {
    return;
  }

  for (const category of defaultCategories) {
    const existing = await categoryRepo.findOne({ where: { code: category.code } });

    if (!existing) {
      await categoryRepo.save(categoryRepo.create(category));
    }
  }
}
