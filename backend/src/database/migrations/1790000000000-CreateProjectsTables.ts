import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateProjectsTables1790000000000 implements MigrationInterface {
  name = 'CreateProjectsTables1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        schema: 'hr',
        name: 'projects',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'name', type: 'varchar', length: '200', isNullable: false },
          { name: 'code', type: 'varchar', length: '50', isUnique: true, isNullable: true },
          { name: 'client_id', type: 'uuid', isNullable: false },
          { name: 'manager_id', type: 'uuid', isNullable: false },
          { name: 'status', type: 'varchar', length: '20', default: "'draft'", isNullable: false },
          { name: 'start_date', type: 'date', isNullable: false },
          { name: 'end_date', type: 'date', isNullable: true },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'hourly_rate', type: 'decimal', precision: 10, scale: 2, isNullable: true },
          { name: 'budget', type: 'decimal', precision: 15, scale: 2, isNullable: true },
          { name: 'alert_days_before_end', type: 'int', default: 30, isNullable: false },
          { name: 'created_at', type: 'timestamp', default: 'NOW()' },
          { name: 'updated_at', type: 'timestamp', default: 'NOW()' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        schema: 'hr',
        name: 'project_allocations',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'project_id', type: 'uuid', isNullable: false },
          { name: 'employee_id', type: 'uuid', isNullable: false },
          { name: 'allocation_type', type: 'varchar', length: '20', isNullable: false },
          { name: 'allocation_value', type: 'decimal', precision: 5, scale: 2, isNullable: false },
          { name: 'start_date', type: 'date', isNullable: false },
          { name: 'end_date', type: 'date', isNullable: true },
          { name: 'role_in_project', type: 'varchar', length: '100', isNullable: true },
          {
            name: 'hourly_rate_override',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          { name: 'alert_days_before_end', type: 'int', default: 15, isNullable: false },
          { name: 'notes', type: 'text', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'NOW()' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        schema: 'hr',
        name: 'project_team_allocations',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'project_id', type: 'uuid', isNullable: false },
          { name: 'team_id', type: 'uuid', isNullable: false },
          { name: 'start_date', type: 'date', isNullable: false },
          { name: 'end_date', type: 'date', isNullable: true },
          {
            name: 'allocation_percentage',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: false,
          },
          { name: 'created_at', type: 'timestamp', default: 'NOW()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'hr.projects',
      new TableIndex({ name: 'idx_projects_status', columnNames: ['status'] }),
    );
    await queryRunner.createIndex(
      'hr.projects',
      new TableIndex({ name: 'idx_projects_client_id', columnNames: ['client_id'] }),
    );
    await queryRunner.createIndex(
      'hr.projects',
      new TableIndex({ name: 'idx_projects_manager_id', columnNames: ['manager_id'] }),
    );
    await queryRunner.createIndex(
      'hr.project_allocations',
      new TableIndex({ name: 'idx_allocations_project_id', columnNames: ['project_id'] }),
    );
    await queryRunner.createIndex(
      'hr.project_allocations',
      new TableIndex({ name: 'idx_allocations_employee_id', columnNames: ['employee_id'] }),
    );

    await queryRunner.createForeignKey(
      'hr.projects',
      new TableForeignKey({
        columnNames: ['client_id'],
        referencedTableName: 'hr.clients',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'hr.projects',
      new TableForeignKey({
        columnNames: ['manager_id'],
        referencedTableName: 'hr.employees',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'hr.project_allocations',
      new TableForeignKey({
        columnNames: ['project_id'],
        referencedTableName: 'hr.projects',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'hr.project_allocations',
      new TableForeignKey({
        columnNames: ['employee_id'],
        referencedTableName: 'hr.employees',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS hr.project_team_allocations`);
    await queryRunner.query(`DROP TABLE IF EXISTS hr.project_allocations`);
    await queryRunner.query(`DROP TABLE IF EXISTS hr.projects`);
  }
}
