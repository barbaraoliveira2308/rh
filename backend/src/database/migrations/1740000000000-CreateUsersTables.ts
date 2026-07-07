import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateUsersTables1740000000000 implements MigrationInterface {
  name = 'CreateUsersTables1740000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        schema: 'hr',
        name: 'departments',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'name', type: 'varchar', length: '100', isUnique: true, isNullable: false },
          { name: 'code', type: 'varchar', length: '20', isUnique: true, isNullable: true },
          { name: 'parent_id', type: 'uuid', isNullable: true },
          { name: 'manager_id', type: 'uuid', isNullable: true },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'is_active', type: 'boolean', default: true },
          { name: 'created_at', type: 'timestamp', default: 'NOW()', isNullable: false },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        schema: 'hr',
        name: 'job_titles',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'name', type: 'varchar', length: '100', isUnique: true, isNullable: false },
          { name: 'level', type: 'varchar', length: '50', isNullable: true },
          { name: 'department_id', type: 'uuid', isNullable: true },
          { name: 'hourly_rate', type: 'decimal', precision: 10, scale: 2, isNullable: true },
          { name: 'is_active', type: 'boolean', default: true },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        schema: 'hr',
        name: 'employees',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'user_id', type: 'uuid', isUnique: true, isNullable: false },
          {
            name: 'employee_number',
            type: 'varchar',
            length: '20',
            isUnique: true,
            isNullable: false,
          },
          { name: 'first_name', type: 'varchar', length: '100', isNullable: false },
          { name: 'last_name', type: 'varchar', length: '100', isNullable: false },
          { name: 'email', type: 'varchar', length: '255', isUnique: true, isNullable: false },
          { name: 'personal_email', type: 'varchar', length: '255', isNullable: true },
          { name: 'phone', type: 'varchar', length: '20', isNullable: true },
          { name: 'nif', type: 'varchar', length: '20', isUnique: true, isNullable: true },
          { name: 'birth_date', type: 'date', isNullable: true },
          { name: 'address', type: 'text', isNullable: true },
          { name: 'nationality', type: 'varchar', length: '50', isNullable: true },
          { name: 'gender', type: 'varchar', length: '20', isNullable: true },
          { name: 'photo_url', type: 'varchar', length: '512', isNullable: true },
          { name: 'department_id', type: 'uuid', isNullable: true },
          { name: 'job_title_id', type: 'uuid', isNullable: true },
          { name: 'manager_id', type: 'uuid', isNullable: true },
          { name: 'employment_start_date', type: 'date', isNullable: false },
          { name: 'employment_end_date', type: 'date', isNullable: true },
          { name: 'status', type: 'varchar', length: '20', default: "'active'", isNullable: false },
          { name: 'work_location', type: 'varchar', length: '100', isNullable: true },
          { name: 'iban', type: 'varchar', length: '34', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'NOW()' },
          { name: 'updated_at', type: 'timestamp', default: 'NOW()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'hr.departments',
      new TableIndex({ name: 'idx_departments_parent_id', columnNames: ['parent_id'] }),
    );

    await queryRunner.createIndex(
      'hr.job_titles',
      new TableIndex({ name: 'idx_job_titles_department_id', columnNames: ['department_id'] }),
    );

    await queryRunner.createIndex(
      'hr.employees',
      new TableIndex({ name: 'idx_employees_user_id', columnNames: ['user_id'] }),
    );
    await queryRunner.createIndex(
      'hr.employees',
      new TableIndex({ name: 'idx_employees_email', columnNames: ['email'] }),
    );
    await queryRunner.createIndex(
      'hr.employees',
      new TableIndex({ name: 'idx_employees_department_id', columnNames: ['department_id'] }),
    );
    await queryRunner.createIndex(
      'hr.employees',
      new TableIndex({ name: 'idx_employees_manager_id', columnNames: ['manager_id'] }),
    );
    await queryRunner.createIndex(
      'hr.employees',
      new TableIndex({ name: 'idx_employees_status', columnNames: ['status'] }),
    );

    await queryRunner.createForeignKey(
      'hr.departments',
      new TableForeignKey({
        columnNames: ['parent_id'],
        referencedTableName: 'hr.departments',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'hr.job_titles',
      new TableForeignKey({
        columnNames: ['department_id'],
        referencedTableName: 'hr.departments',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'hr.employees',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'hr.users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'hr.employees',
      new TableForeignKey({
        columnNames: ['department_id'],
        referencedTableName: 'hr.departments',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'hr.employees',
      new TableForeignKey({
        columnNames: ['job_title_id'],
        referencedTableName: 'hr.job_titles',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'hr.employees',
      new TableForeignKey({
        columnNames: ['manager_id'],
        referencedTableName: 'hr.employees',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS hr.employees`);
    await queryRunner.query(`DROP TABLE IF EXISTS hr.job_titles`);
    await queryRunner.query(`DROP TABLE IF EXISTS hr.departments`);
  }
}
