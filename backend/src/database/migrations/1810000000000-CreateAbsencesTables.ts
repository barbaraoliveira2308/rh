import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
  TableUnique,
} from 'typeorm';

export class CreateAbsencesTables1810000000000 implements MigrationInterface {
  name = 'CreateAbsencesTables1810000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        schema: 'hr',
        name: 'absence_types',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'name', type: 'varchar', length: '100', isUnique: true, isNullable: false },
          { name: 'code', type: 'varchar', length: '20', isUnique: true, isNullable: false },
          { name: 'unit', type: 'varchar', length: '10', default: "'days'", isNullable: false },
          { name: 'limit_per_year', type: 'decimal', precision: 6, scale: 2, isNullable: true },
          { name: 'requires_document', type: 'boolean', default: false, isNullable: false },
          { name: 'is_paid', type: 'boolean', default: true, isNullable: false },
          { name: 'affects_balance', type: 'boolean', default: true, isNullable: false },
          { name: 'color', type: 'varchar', length: '7', isNullable: true },
          { name: 'is_system', type: 'boolean', default: false, isNullable: false },
          { name: 'is_active', type: 'boolean', default: true, isNullable: false },
          { name: 'blocked_periods', type: 'text', isNullable: true },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        schema: 'hr',
        name: 'absence_requests',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'employee_id', type: 'uuid', isNullable: false },
          { name: 'absence_type_id', type: 'uuid', isNullable: false },
          { name: 'start_date', type: 'date', isNullable: false },
          { name: 'end_date', type: 'date', isNullable: false },
          { name: 'start_half', type: 'boolean', default: false, isNullable: false },
          { name: 'end_half', type: 'boolean', default: false, isNullable: false },
          {
            name: 'total_days',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'total_hours',
            type: 'decimal',
            precision: 6,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'pending'",
            isNullable: false,
          },
          { name: 'reason', type: 'text', isNullable: true },
          { name: 'rejection_reason', type: 'text', isNullable: true },
          { name: 'document_url', type: 'varchar', length: '512', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'NOW()' },
          { name: 'updated_at', type: 'timestamp', default: 'NOW()' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        schema: 'hr',
        name: 'absence_approvals',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'absence_id', type: 'uuid', isNullable: false },
          { name: 'approver_id', type: 'uuid', isNullable: false },
          { name: 'decision', type: 'varchar', length: '20', isNullable: false },
          { name: 'decided_at', type: 'timestamp', default: 'NOW()' },
          { name: 'comments', type: 'text', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'NOW()' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        schema: 'hr',
        name: 'leave_balances',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'employee_id', type: 'uuid', isNullable: false },
          { name: 'absence_type_id', type: 'uuid', isNullable: false },
          { name: 'year', type: 'int', isNullable: false },
          {
            name: 'entitled_days',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'used_days',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'pending_days',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'remaining_days',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'carry_over_days',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0,
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'hr.absence_requests',
      new TableIndex({ name: 'idx_absence_requests_employee', columnNames: ['employee_id'] }),
    );
    await queryRunner.createIndex(
      'hr.absence_requests',
      new TableIndex({ name: 'idx_absence_requests_status', columnNames: ['status'] }),
    );
    await queryRunner.createIndex(
      'hr.leave_balances',
      new TableIndex({
        name: 'idx_leave_balances_employee_year',
        columnNames: ['employee_id', 'year'],
      }),
    );

    await queryRunner.createUniqueConstraint(
      'hr.leave_balances',
      new TableUnique({
        name: 'uq_leave_balances_employee_type_year',
        columnNames: ['employee_id', 'absence_type_id', 'year'],
      }),
    );

    await queryRunner.createForeignKey(
      'hr.absence_requests',
      new TableForeignKey({
        columnNames: ['employee_id'],
        referencedTableName: 'hr.employees',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'hr.absence_requests',
      new TableForeignKey({
        columnNames: ['absence_type_id'],
        referencedTableName: 'hr.absence_types',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'hr.absence_approvals',
      new TableForeignKey({
        columnNames: ['absence_id'],
        referencedTableName: 'hr.absence_requests',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'hr.absence_approvals',
      new TableForeignKey({
        columnNames: ['approver_id'],
        referencedTableName: 'hr.employees',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'hr.leave_balances',
      new TableForeignKey({
        columnNames: ['employee_id'],
        referencedTableName: 'hr.employees',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'hr.leave_balances',
      new TableForeignKey({
        columnNames: ['absence_type_id'],
        referencedTableName: 'hr.absence_types',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS hr.leave_balances`);
    await queryRunner.query(`DROP TABLE IF EXISTS hr.absence_approvals`);
    await queryRunner.query(`DROP TABLE IF EXISTS hr.absence_requests`);
    await queryRunner.query(`DROP TABLE IF EXISTS hr.absence_types`);
  }
}
