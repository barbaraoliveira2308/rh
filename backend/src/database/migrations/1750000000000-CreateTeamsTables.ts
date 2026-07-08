import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateTeamsTables1750000000000 implements MigrationInterface {
  name = 'CreateTeamsTables1750000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        schema: 'hr',
        name: 'teams',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'name', type: 'varchar', length: '100', isUnique: true, isNullable: false },
          { name: 'department_id', type: 'uuid', isNullable: false },
          { name: 'leader_id', type: 'uuid', isNullable: true },
          { name: 'description', type: 'text', isNullable: true },
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
        name: 'team_members',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'team_id', type: 'uuid', isNullable: false },
          { name: 'employee_id', type: 'uuid', isNullable: false },
          { name: 'start_date', type: 'date', isNullable: false },
          { name: 'end_date', type: 'date', isNullable: true },
          { name: 'role_in_team', type: 'varchar', length: '100', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'NOW()' },
          { name: 'updated_at', type: 'timestamp', default: 'NOW()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'hr.teams',
      new TableIndex({ name: 'idx_teams_department_id', columnNames: ['department_id'] }),
    );

    await queryRunner.createIndex(
      'hr.team_members',
      new TableIndex({ name: 'idx_team_members_team_id', columnNames: ['team_id'] }),
    );
    await queryRunner.createIndex(
      'hr.team_members',
      new TableIndex({ name: 'idx_team_members_employee_id', columnNames: ['employee_id'] }),
    );
    await queryRunner.createIndex(
      'hr.team_members',
      new TableIndex({
        name: 'idx_team_members_dates',
        columnNames: ['team_id', 'employee_id', 'start_date', 'end_date'],
      }),
    );

    await queryRunner.createForeignKey(
      'hr.teams',
      new TableForeignKey({
        columnNames: ['department_id'],
        referencedTableName: 'hr.departments',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'hr.teams',
      new TableForeignKey({
        columnNames: ['leader_id'],
        referencedTableName: 'hr.employees',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'hr.team_members',
      new TableForeignKey({
        columnNames: ['team_id'],
        referencedTableName: 'hr.teams',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'hr.team_members',
      new TableForeignKey({
        columnNames: ['employee_id'],
        referencedTableName: 'hr.employees',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS hr.team_members`);
    await queryRunner.query(`DROP TABLE IF EXISTS hr.teams`);
  }
}
