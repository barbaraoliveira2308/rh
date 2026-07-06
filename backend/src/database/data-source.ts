import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env['POSTGRES_HOST'] ?? 'localhost',
  port: Number(process.env['POSTGRES_PORT']) ?? 5432,
  database: process.env['POSTGRES_DB'] ?? 'srh',
  username: process.env['POSTGRES_USER'] ?? 'srh_user',
  password: process.env['POSTGRES_PASSWORD'] ?? 'srh_dev_pass',
  entities: [__dirname + '/../**/*.entity.{ts,js}'],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  migrationsTableName: 'migrations',
  schema: 'hr',
  synchronize: false,
  logging: process.env['NODE_ENV'] === 'development',
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
