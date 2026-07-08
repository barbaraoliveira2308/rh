import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateClientsTables1760000000000 implements MigrationInterface {
  name = 'CreateClientsTables1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        schema: 'hr',
        name: 'clients',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'name', type: 'varchar', length: '200', isNullable: false },
          { name: 'nif', type: 'varchar', length: '20', isUnique: true, isNullable: true },
          { name: 'contact_name', type: 'varchar', length: '100', isNullable: true },
          { name: 'email', type: 'varchar', length: '255', isNullable: true },
          { name: 'phone', type: 'varchar', length: '20', isNullable: true },
          { name: 'address', type: 'text', isNullable: true },
          { name: 'responsible_id', type: 'uuid', isNullable: true },
          { name: 'status', type: 'varchar', length: '20', default: "'active'", isNullable: false },
          { name: 'deleted_at', type: 'timestamp', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'NOW()' },
          { name: 'updated_at', type: 'timestamp', default: 'NOW()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'hr.clients',
      new TableIndex({ name: 'idx_clients_status', columnNames: ['status'] }),
    );

    await queryRunner.createForeignKey(
      'hr.clients',
      new TableForeignKey({
        columnNames: ['responsible_id'],
        referencedTableName: 'hr.employees',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS hr.clients`);
  }
}
