import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { dataSourceOptions } from '../data-source';
import { rbacSeed } from './index';

config();

async function main(): Promise<void> {
  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();

  // eslint-disable-next-line no-console
  console.log('Running RBAC seed...');
  await rbacSeed(dataSource);
  // eslint-disable-next-line no-console
  console.log('RBAC seed completed.');

  await dataSource.destroy();
}

main().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Seed failed:', error);
  process.exit(1);
});
