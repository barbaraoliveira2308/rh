import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateContractsTables1770000000000 implements MigrationInterface {
  name = 'CreateContractsTables1770000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        schema: 'hr',
        name: 'contracts',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'employee_id', type: 'uuid', isNullable: false },
          { name: 'contract_type', type: 'varchar', length: '20', isNullable: false },
          { name: 'status', type: 'varchar', length: '20', default: "'draft'", isNullable: false },
          { name: 'start_date', type: 'date', isNullable: false },
          { name: 'end_date', type: 'date', isNullable: true },
          { name: 'value', type: 'decimal', precision: 12, scale: 2, isNullable: true },
          { name: 'currency', type: 'varchar', length: '3', default: "'EUR'", isNullable: false },
          { name: 'contracting_entity', type: 'varchar', length: '200', isNullable: false },
          { name: 'renewal_alert_days', type: 'int', default: 30, isNullable: false },
          { name: 'document_url', type: 'varchar', length: '512', isNullable: true },
          { name: 'notes', type: 'text', isNullable: true },
          { name: 'terminated_at', type: 'timestamp', isNullable: true },
          { name: 'termination_reason', type: 'text', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'NOW()' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        schema: 'hr',
        name: 'contract_renewals',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'contract_id', type: 'uuid', isNullable: false },
          { name: 'renewed_at', type: 'timestamp', isNullable: false },
          { name: 'previous_end_date', type: 'date', isNullable: true },
          { name: 'new_end_date', type: 'date', isNullable: false },
          { name: 'created_at', type: 'timestamp', default: 'NOW()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'hr.contracts',
      new TableIndex({ name: 'idx_contracts_employee_id', columnNames: ['employee_id'] }),
    );
    await queryRunner.createIndex(
      'hr.contracts',
      new TableIndex({ name: 'idx_contracts_status', columnNames: ['status'] }),
    );
    await queryRunner.createIndex(
      'hr.contract_renewals',
      new TableIndex({ name: 'idx_contract_renewals_contract_id', columnNames: ['contract_id'] }),
    );

    await queryRunner.createForeignKey(
      'hr.contracts',
      new TableForeignKey({
        columnNames: ['employee_id'],
        referencedTableName: 'hr.employees',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'hr.contract_renewals',
      new TableForeignKey({
        columnNames: ['contract_id'],
        referencedTableName: 'hr.contracts',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS hr.contract_renewals`);
    await queryRunner.query(`DROP TABLE IF EXISTS hr.contracts`);
  }
}
