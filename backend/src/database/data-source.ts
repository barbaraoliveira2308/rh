import {
  DataSource,
  DataSourceOptions,
  DefaultNamingStrategy,
  NamingStrategyInterface,
} from 'typeorm';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../../../.env') });

class CamelToSnakeNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  columnName(propertyName: string, customName: string, embeddedPrefixes: string[]): string {
    if (customName) return customName;
    return (
      embeddedPrefixes.join('_') +
      propertyName.replace(/([A-Z])/g, (match) => `_${match.toLowerCase()}`)
    ).toLowerCase();
  }
}

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: process.env.POSTGRES_PORT ? Number(process.env.POSTGRES_PORT) : 5432,
  database: process.env.POSTGRES_DB ?? 'srh',
  username: process.env.POSTGRES_USER ?? 'srh_user',
  password: process.env.POSTGRES_PASSWORD ?? 'srh_dev_pass',
  entities: [__dirname + '/../**/*.entity.{ts,js}'],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  migrationsTableName: 'migrations',
  schema: 'hr',
  synchronize: false,
  namingStrategy: new CamelToSnakeNamingStrategy(),
  logging: process.env.NODE_ENV === 'development',
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
