import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateTimesheetsTables1800000000000 implements MigrationInterface {
  name = 'CreateTimesheetsTables1800000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        schema: 'hr',
        name: 'timesheet_periods',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'employee_id', type: 'uuid', isNullable: false },
          { name: 'period_year', type: 'int', isNullable: false },
          { name: 'period_month', type: 'int', isNullable: false },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'in_progress'",
            isNullable: false,
          },
          { name: 'submitted_at', type: 'timestamp', isNullable: true },
          { name: 'approved_at', type: 'timestamp', isNullable: true },
          { name: 'approved_by', type: 'uuid', isNullable: true },
          {
            name: 'total_planned_hours',
            type: 'decimal',
            precision: 6,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'total_worked_hours',
            type: 'decimal',
            precision: 6,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'total_overtime_hours',
            type: 'decimal',
            precision: 6,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'hours_balance',
            type: 'decimal',
            precision: 6,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          { name: 'created_at', type: 'timestamp', default: 'NOW()' },
          { name: 'updated_at', type: 'timestamp', default: 'NOW()' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        schema: 'hr',
        name: 'timesheet_entries',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'timesheet_id', type: 'uuid', isNullable: false },
          { name: 'entry_date', type: 'date', isNullable: false },
          { name: 'project_id', type: 'uuid', isNullable: true },
          { name: 'absence_id', type: 'uuid', isNullable: true },
          {
            name: 'planned_hours',
            type: 'decimal',
            precision: 4,
            scale: 2,
            default: 8,
            isNullable: false,
          },
          {
            name: 'worked_hours',
            type: 'decimal',
            precision: 4,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'overtime_hours',
            type: 'decimal',
            precision: 4,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'entry_type',
            type: 'varchar',
            length: '20',
            default: "'work'",
            isNullable: false,
          },
          { name: 'notes', type: 'text', isNullable: true },
          { name: 'is_locked', type: 'boolean', default: false, isNullable: false },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        schema: 'hr',
        name: 'timesheet_approvals',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'timesheet_id', type: 'uuid', isNullable: false },
          { name: 'approved_by', type: 'uuid', isNullable: false },
          { name: 'approved_at', type: 'timestamp', default: 'NOW()' },
          { name: 'comment', type: 'text', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'NOW()' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        schema: 'hr',
        name: 'holiday_calendars',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'country_code', type: 'varchar', length: '5', isNullable: false },
          { name: 'holiday_date', type: 'date', isNullable: false },
          { name: 'name', type: 'varchar', length: '100', isNullable: false },
          { name: 'is_mandatory', type: 'boolean', default: true, isNullable: false },
          { name: 'region', type: 'varchar', length: '50', isNullable: true },
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
          { name: 'start_date', type: 'date', isNullable: false },
          { name: 'end_date', type: 'date', isNullable: false },
          { name: 'type', type: 'varchar', length: '50', isNullable: false },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'pending'",
            isNullable: false,
          },
          { name: 'hours', type: 'decimal', precision: 4, scale: 2, isNullable: true },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'hr.timesheet_periods',
      new TableIndex({
        name: 'idx_timesheet_periods_employee',
        columnNames: ['employee_id'],
      }),
    );
    await queryRunner.createIndex(
      'hr.timesheet_periods',
      new TableIndex({
        name: 'idx_timesheet_periods_status',
        columnNames: ['status'],
      }),
    );
    await queryRunner.createIndex(
      'hr.timesheet_entries',
      new TableIndex({
        name: 'idx_timesheet_entries_timesheet',
        columnNames: ['timesheet_id'],
      }),
    );
    await queryRunner.createIndex(
      'hr.holiday_calendars',
      new TableIndex({
        name: 'idx_holiday_calendars_date',
        columnNames: ['holiday_date'],
      }),
    );

    await queryRunner.createForeignKey(
      'hr.timesheet_periods',
      new TableForeignKey({
        columnNames: ['employee_id'],
        referencedTableName: 'hr.employees',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'hr.timesheet_entries',
      new TableForeignKey({
        columnNames: ['timesheet_id'],
        referencedTableName: 'hr.timesheet_periods',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'hr.timesheet_entries',
      new TableForeignKey({
        columnNames: ['project_id'],
        referencedTableName: 'hr.projects',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'hr.timesheet_approvals',
      new TableForeignKey({
        columnNames: ['timesheet_id'],
        referencedTableName: 'hr.timesheet_periods',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'hr.timesheet_approvals',
      new TableForeignKey({
        columnNames: ['approved_by'],
        referencedTableName: 'hr.employees',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS hr.timesheet_approvals`);
    await queryRunner.query(`DROP TABLE IF EXISTS hr.timesheet_entries`);
    await queryRunner.query(`DROP TABLE IF EXISTS hr.timesheet_periods`);
    await queryRunner.query(`DROP TABLE IF EXISTS hr.holiday_calendars`);
    await queryRunner.query(`DROP TABLE IF EXISTS hr.absence_requests`);
  }
}
