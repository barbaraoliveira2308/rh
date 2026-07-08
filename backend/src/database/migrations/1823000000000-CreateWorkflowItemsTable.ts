import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateWorkflowItemsTable1823000000000 implements MigrationInterface {
  name = 'CreateWorkflowItemsTable1823000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        schema: 'hr',
        name: 'workflow_items',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          {
            name: 'type',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          { name: 'reference_id', type: 'uuid', isNullable: false },
          { name: 'reference_type', type: 'varchar', length: '50', isNullable: false },
          { name: 'requester_id', type: 'uuid', isNullable: false },
          { name: 'assignee_id', type: 'uuid', isNullable: false },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'PENDING'",
            isNullable: false,
          },
          { name: 'requested_at', type: 'timestamp', default: 'NOW()' },
          { name: 'resolved_at', type: 'timestamp', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'NOW()' },
          { name: 'updated_at', type: 'timestamp', default: 'NOW()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'hr.workflow_items',
      new TableIndex({
        name: 'idx_workflow_items_assignee_status',
        columnNames: ['assignee_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'hr.workflow_items',
      new TableIndex({
        name: 'idx_workflow_items_reference',
        columnNames: ['reference_id', 'type'],
      }),
    );

    await queryRunner.createForeignKey(
      'hr.workflow_items',
      new TableForeignKey({
        columnNames: ['requester_id'],
        referencedTableName: 'hr.employees',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'hr.workflow_items',
      new TableForeignKey({
        columnNames: ['assignee_id'],
        referencedTableName: 'hr.employees',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS hr.workflow_items`);
  }
}
