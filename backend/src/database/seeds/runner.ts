import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { resolve } from 'path';
import { dataSourceOptions } from '../data-source';
import { rbacSeed } from './index';
import { run as expenseCategoriesSeed } from '../../expenses/seeds/expense-categories.seed';
import { run as notificationTemplatesSeed } from '../../notifications/seeds/notifications-templates.seed';
import { runAbsenceTypesSeed } from '../../absences/absences.seed';

config({ path: resolve(__dirname, '../../../../.env') });

async function main(): Promise<void> {
  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();

  // eslint-disable-next-line no-console
  console.log('Running RBAC seed...');
  await rbacSeed(dataSource);
  // eslint-disable-next-line no-console
  console.log('RBAC seed completed.');

  // eslint-disable-next-line no-console
  console.log('Running expense categories seed...');
  await expenseCategoriesSeed(dataSource);
  // eslint-disable-next-line no-console
  console.log('Expense categories seed completed.');

  // eslint-disable-next-line no-console
  console.log('Running notification templates seed...');
  await notificationTemplatesSeed(dataSource);
  // eslint-disable-next-line no-console
  console.log('Notification templates seed completed.');

  // eslint-disable-next-line no-console
  console.log('Running absence types seed...');
  await runAbsenceTypesSeed(dataSource);
  // eslint-disable-next-line no-console
  console.log('Absence types seed completed.');

  await dataSource.destroy();
}

main().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Seed failed:', error);
  process.exit(1);
});
