import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { dataSourceOptions } from '../data-source';
import { rbacSeed } from './rbac.seed';

config();

async function main(): Promise<void> {
  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();

  console.log('Running RBAC seed...');
  await rbacSeed(dataSource);
  console.log('RBAC seed completed.');

  await dataSource.destroy();
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
