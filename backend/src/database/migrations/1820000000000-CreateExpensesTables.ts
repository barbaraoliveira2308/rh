import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
  TableUnique,
} from 'typeorm';

export class CreateExpensesTables1820000000000 implements MigrationInterface {
  name = 'CreateExpensesTables1820000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        schema: 'hr',
        name: 'expense_categories',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'name', type: 'varchar', length: '100', isUnique: true, isNullable: false },
          { name: 'code', type: 'varchar', length: '50', isUnique: true, isNullable: false },
          {
            name: 'limit_amount',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: true,
          },
          { name: 'requires_receipt', type: 'boolean', default: true, isNullable: false },
          { name: 'is_active', type: 'boolean', default: true, isNullable: false },
          { name: 'created_at', type: 'timestamp', default: 'NOW()' },
          { name: 'updated_at', type: 'timestamp', default: 'NOW()' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        schema: 'hr',
        name: 'expense_reports',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'employee_id', type: 'uuid', isNullable: false },
          { name: 'title', type: 'varchar', length: '200', isNullable: false },
          { name: 'period_start', type: 'date', isNullable: false },
          { name: 'period_end', type: 'date', isNullable: false },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'draft'",
            isNullable: false,
          },
          {
            name: 'total_amount',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          { name: 'currency', type: 'varchar', length: '3', default: "'EUR'", isNullable: false },
          { name: 'project_id', type: 'uuid', isNullable: true },
          { name: 'notes', type: 'text', isNullable: true },
          { name: 'submitted_at', type: 'timestamp', isNullable: true },
          { name: 'approved_at', type: 'timestamp', isNullable: true },
          { name: 'approved_by', type: 'uuid', isNullable: true },
          { name: 'rejection_reason', type: 'text', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'NOW()' },
          { name: 'updated_at', type: 'timestamp', default: 'NOW()' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        schema: 'hr',
        name: 'expense_items',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'report_id', type: 'uuid', isNullable: false },
          { name: 'category_id', type: 'uuid', isNullable: false },
          { name: 'description', type: 'varchar', length: '200', isNullable: false },
          {
            name: 'amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '3',
            default: "'EUR'",
            isNullable: false,
          },
          { name: 'expense_date', type: 'date', isNullable: false },
          { name: 'receipt_url', type: 'varchar', length: '512', isNullable: true },
          { name: 'is_duplicate', type: 'boolean', default: false, isNullable: false },
          { name: 'created_at', type: 'timestamp', default: 'NOW()' },
          { name: 'updated_at', type: 'timestamp', default: 'NOW()' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        schema: 'hr',
        name: 'expense_approvals',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'report_id', type: 'uuid', isNullable: false },
          { name: 'approver_id', type: 'uuid', isNullable: false },
          { name: 'decision', type: 'varchar', length: '20', isNullable: false },
          { name: 'decided_at', type: 'timestamp', default: 'NOW()' },
          { name: 'comments', type: 'text', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'NOW()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'hr.expense_reports',
      new TableIndex({ name: 'idx_expense_reports_employee', columnNames: ['employee_id'] }),
    );
    await queryRunner.createIndex(
      'hr.expense_reports',
      new TableIndex({ name: 'idx_expense_reports_status', columnNames: ['status'] }),
    );
    await queryRunner.createIndex(
      'hr.expense_items',
      new TableIndex({ name: 'idx_expense_items_report', columnNames: ['report_id'] }),
    );
    await queryRunner.createIndex(
      'hr.expense_items',
      new TableIndex({ name: 'idx_expense_items_category', columnNames: ['category_id'] }),
    );
    await queryRunner.createIndex(
      'hr.expense_approvals',
      new TableIndex({ name: 'idx_expense_approvals_report', columnNames: ['report_id'] }),
    );

    await queryRunner.createUniqueConstraint(
      'hr.expense_categories',
      new TableUnique({
        name: 'uq_expense_categories_code',
        columnNames: ['code'],
      }),
    );

    await queryRunner.createForeignKey(
      'hr.expense_reports',
      new TableForeignKey({
        columnNames: ['employee_id'],
        referencedTableName: 'hr.employees',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'hr.expense_items',
      new TableForeignKey({
        columnNames: ['report_id'],
        referencedTableName: 'hr.expense_reports',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'hr.expense_items',
      new TableForeignKey({
        columnNames: ['category_id'],
        referencedTableName: 'hr.expense_categories',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'hr.expense_approvals',
      new TableForeignKey({
        columnNames: ['report_id'],
        referencedTableName: 'hr.expense_reports',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'hr.expense_approvals',
      new TableForeignKey({
        columnNames: ['approver_id'],
        referencedTableName: 'hr.employees',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS hr.expense_approvals`);
    await queryRunner.query(`DROP TABLE IF EXISTS hr.expense_items`);
    await queryRunner.query(`DROP TABLE IF EXISTS hr.expense_reports`);
    await queryRunner.query(`DROP TABLE IF EXISTS hr.expense_categories`);
  }
}
