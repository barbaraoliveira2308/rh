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

    // absence_requests was already created by CreateTimesheetsTables1800000000000
    // with old columns (type, hours). ALTER it to the new schema.
    await queryRunner.query(
      `ALTER TABLE "hr"."absence_requests" ADD COLUMN "absence_type_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "hr"."absence_requests" ADD COLUMN "start_half" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "hr"."absence_requests" ADD COLUMN "end_half" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "hr"."absence_requests" ADD COLUMN "total_days" decimal(5,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "hr"."absence_requests" ADD COLUMN "total_hours" decimal(6,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(`ALTER TABLE "hr"."absence_requests" ADD COLUMN "reason" text`);
    await queryRunner.query(
      `ALTER TABLE "hr"."absence_requests" ADD COLUMN "rejection_reason" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "hr"."absence_requests" ADD COLUMN "document_url" varchar(512)`,
    );
    await queryRunner.query(
      `ALTER TABLE "hr"."absence_requests" ADD COLUMN "created_at" timestamp NOT NULL DEFAULT NOW()`,
    );
    await queryRunner.query(
      `ALTER TABLE "hr"."absence_requests" ADD COLUMN "updated_at" timestamp NOT NULL DEFAULT NOW()`,
    );
    await queryRunner.query(`ALTER TABLE "hr"."absence_requests" DROP COLUMN "type"`);
    await queryRunner.query(`ALTER TABLE "hr"."absence_requests" DROP COLUMN "hours"`);
    // Set absence_type_id NOT NULL after data migration (none in dev)
    await queryRunner.query(
      `ALTER TABLE "hr"."absence_requests" ALTER COLUMN "absence_type_id" SET NOT NULL`,
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
    await queryRunner.query(`DROP TABLE IF EXISTS hr.absence_types`);
    // Revert absence_requests to the old schema from CreateTimesheetsTables1800000000000
    await queryRunner.query(
      `ALTER TABLE "hr"."absence_requests" DROP COLUMN IF EXISTS "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hr"."absence_requests" DROP COLUMN IF EXISTS "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hr"."absence_requests" DROP COLUMN IF EXISTS "document_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hr"."absence_requests" DROP COLUMN IF EXISTS "rejection_reason"`,
    );
    await queryRunner.query(`ALTER TABLE "hr"."absence_requests" DROP COLUMN IF EXISTS "reason"`);
    await queryRunner.query(
      `ALTER TABLE "hr"."absence_requests" DROP COLUMN IF EXISTS "total_hours"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hr"."absence_requests" DROP COLUMN IF EXISTS "total_days"`,
    );
    await queryRunner.query(`ALTER TABLE "hr"."absence_requests" DROP COLUMN IF EXISTS "end_half"`);
    await queryRunner.query(
      `ALTER TABLE "hr"."absence_requests" DROP COLUMN IF EXISTS "start_half"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hr"."absence_requests" DROP COLUMN IF EXISTS "absence_type_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hr"."absence_requests" ADD COLUMN "type" varchar(50) NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "hr"."absence_requests" ADD COLUMN "hours" decimal(4,2)`);
  }
}
