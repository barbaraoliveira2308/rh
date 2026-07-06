import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateAuthTables1720000000000 implements MigrationInterface {
  name = 'CreateAuthTables1720000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.createTable(
      new Table({
        schema: 'hr',
        name: 'users',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'email', type: 'varchar', length: '255', isUnique: true, isNullable: false },
          { name: 'username', type: 'varchar', length: '100', isUnique: true, isNullable: false },
          { name: 'password_hash', type: 'varchar', length: '512', isNullable: false },
          { name: 'is_active', type: 'boolean', default: true },
          { name: 'mfa_enabled', type: 'boolean', default: false },
          { name: 'mfa_secret', type: 'varchar', length: '512', isNullable: true },
          { name: 'last_login_at', type: 'timestamp', isNullable: true },
          { name: 'failed_login_count', type: 'int', default: 0 },
          { name: 'locked_until', type: 'timestamp', isNullable: true },
          { name: 'password_changed_at', type: 'timestamp', default: 'NOW()' },
          { name: 'created_at', type: 'timestamp', default: 'NOW()' },
          { name: 'updated_at', type: 'timestamp', default: 'NOW()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'hr.users',
      new TableIndex({ name: 'idx_users_email', columnNames: ['email'] }),
    );
    await queryRunner.createIndex(
      'hr.users',
      new TableIndex({ name: 'idx_users_username', columnNames: ['username'] }),
    );
    await queryRunner.createIndex(
      'hr.users',
      new TableIndex({ name: 'idx_users_is_active', columnNames: ['is_active'] }),
    );

    await queryRunner.createTable(
      new Table({
        schema: 'hr',
        name: 'sessions',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'user_id', type: 'uuid', isNullable: false },
          { name: 'token_hash', type: 'varchar', length: '512', isUnique: true, isNullable: false },
          { name: 'ip_address', type: 'varchar', length: '45', isNullable: false },
          { name: 'user_agent', type: 'text', isNullable: true },
          { name: 'expires_at', type: 'timestamp', isNullable: false },
          { name: 'revoked_at', type: 'timestamp', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'NOW()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'hr.sessions',
      new TableIndex({ name: 'idx_sessions_user_id', columnNames: ['user_id'] }),
    );
    await queryRunner.createIndex(
      'hr.sessions',
      new TableIndex({ name: 'idx_sessions_token_hash', columnNames: ['token_hash'] }),
    );
    await queryRunner.createIndex(
      'hr.sessions',
      new TableIndex({ name: 'idx_sessions_expires_at', columnNames: ['expires_at'] }),
    );

    await queryRunner.createTable(
      new Table({
        schema: 'hr',
        name: 'roles',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'name', type: 'varchar', length: '50', isUnique: true, isNullable: false },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'is_system', type: 'boolean', default: false },
          { name: 'created_at', type: 'timestamp', default: 'NOW()' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        schema: 'hr',
        name: 'permissions',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'resource', type: 'varchar', length: '100', isNullable: false },
          { name: 'action', type: 'varchar', length: '50', isNullable: false },
          { name: 'description', type: 'text', isNullable: true },
        ],
        uniques: [
          { name: 'uq_permissions_resource_action', columnNames: ['resource', 'action'] },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        schema: 'hr',
        name: 'role_permissions',
        columns: [
          { name: 'role_id', type: 'uuid', isPrimary: true },
          { name: 'permission_id', type: 'uuid', isPrimary: true },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        schema: 'hr',
        name: 'user_roles',
        columns: [
          { name: 'user_id', type: 'uuid', isPrimary: true },
          { name: 'role_id', type: 'uuid', isPrimary: true },
          { name: 'assigned_at', type: 'timestamp', default: 'NOW()' },
          { name: 'assigned_by', type: 'uuid', isNullable: false },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        schema: 'hr',
        name: 'password_reset_tokens',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'user_id', type: 'uuid', isNullable: false },
          { name: 'token_hash', type: 'varchar', length: '512', isUnique: true, isNullable: false },
          { name: 'expires_at', type: 'timestamp', isNullable: false },
          { name: 'used_at', type: 'timestamp', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'NOW()' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        schema: 'hr',
        name: 'api_keys',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'user_id', type: 'uuid', isNullable: false },
          { name: 'key_hash', type: 'varchar', length: '512', isUnique: true, isNullable: false },
          { name: 'name', type: 'varchar', length: '100', isNullable: false },
          { name: 'last_used_at', type: 'timestamp', isNullable: true },
          { name: 'expires_at', type: 'timestamp', isNullable: true },
          { name: 'revoked_at', type: 'timestamp', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'NOW()' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'hr.sessions',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'hr.users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'hr.role_permissions',
      new TableForeignKey({
        columnNames: ['role_id'],
        referencedTableName: 'hr.roles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'hr.role_permissions',
      new TableForeignKey({
        columnNames: ['permission_id'],
        referencedTableName: 'hr.permissions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'hr.user_roles',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'hr.users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'hr.user_roles',
      new TableForeignKey({
        columnNames: ['role_id'],
        referencedTableName: 'hr.roles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'hr.password_reset_tokens',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'hr.users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'hr.api_keys',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'hr.users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS hr.api_keys`);
    await queryRunner.query(`DROP TABLE IF EXISTS hr.password_reset_tokens`);
    await queryRunner.query(`DROP TABLE IF EXISTS hr.user_roles`);
    await queryRunner.query(`DROP TABLE IF EXISTS hr.role_permissions`);
    await queryRunner.query(`DROP TABLE IF EXISTS hr.permissions`);
    await queryRunner.query(`DROP TABLE IF EXISTS hr.roles`);
    await queryRunner.query(`DROP TABLE IF EXISTS hr.sessions`);
    await queryRunner.query(`DROP TABLE IF EXISTS hr.users`);
  }
}
