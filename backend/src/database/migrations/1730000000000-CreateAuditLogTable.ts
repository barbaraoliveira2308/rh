import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateAuditLogTable1730000000000 implements MigrationInterface {
  name = 'CreateAuditLogTable1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        schema: 'hr',
        name: 'audit_logs',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'user_id', type: 'uuid', isNullable: true },
          { name: 'action', type: 'varchar', length: '100', isNullable: false },
          { name: 'entity_type', type: 'varchar', length: '100', isNullable: false },
          { name: 'entity_id', type: 'uuid', isNullable: false },
          { name: 'old_values', type: 'jsonb', isNullable: true },
          { name: 'new_values', type: 'jsonb', isNullable: true },
          { name: 'ip_address', type: 'varchar', length: '45', isNullable: true },
          { name: 'user_agent', type: 'text', isNullable: true },
          { name: 'timestamp', type: 'timestamp', default: 'NOW()', isNullable: false },
          { name: 'correlation_id', type: 'uuid', isNullable: true },
          { name: 'module', type: 'varchar', length: '50', isNullable: false },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'hr.audit_logs',
      new TableIndex({ name: 'idx_audit_user_id', columnNames: ['user_id'] }),
    );
    await queryRunner.createIndex(
      'hr.audit_logs',
      new TableIndex({ name: 'idx_audit_entity', columnNames: ['entity_type', 'entity_id'] }),
    );
    await queryRunner.createIndex(
      'hr.audit_logs',
      new TableIndex({ name: 'idx_audit_timestamp', columnNames: ['timestamp'] }),
    );

    await queryRunner.createForeignKey(
      'hr.audit_logs',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'hr.users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS hr.audit_logs`);
  }
}
