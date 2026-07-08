import { MigrationInterface, QueryRunner, Table, TableIndex, TableUnique } from 'typeorm';

export class CreateNotificationsTables1822000000000 implements MigrationInterface {
  name = 'CreateNotificationsTables1822000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        schema: 'hr',
        name: 'notification_templates',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'code', type: 'varchar', length: '100', isUnique: true, isNullable: false },
          { name: 'name', type: 'varchar', length: '200', isNullable: false },
          { name: 'subject', type: 'varchar', length: '255', isNullable: false },
          { name: 'body', type: 'text', isNullable: false },
          {
            name: 'channel',
            type: 'varchar',
            length: '20',
            default: "'email'",
            isNullable: false,
          },
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
        name: 'notifications',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'recipient_id', type: 'uuid', isNullable: false },
          { name: 'type', type: 'varchar', length: '100', isNullable: false },
          { name: 'title', type: 'varchar', length: '200', isNullable: false },
          { name: 'body', type: 'text', isNullable: false },
          {
            name: 'channel',
            type: 'varchar',
            length: '20',
            default: "'in_app'",
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'pending'",
            isNullable: false,
          },
          { name: 'reference_id', type: 'uuid', isNullable: true },
          { name: 'reference_type', type: 'varchar', length: '50', isNullable: true },
          { name: 'sent_at', type: 'timestamp', isNullable: true },
          { name: 'read_at', type: 'timestamp', isNullable: true },
          { name: 'metadata', type: 'jsonb', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'NOW()' },
          { name: 'updated_at', type: 'timestamp', default: 'NOW()' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        schema: 'hr',
        name: 'notification_preferences',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'employee_id', type: 'uuid', isNullable: false },
          {
            name: 'notification_type',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          { name: 'email_enabled', type: 'boolean', default: true, isNullable: false },
          { name: 'in_app_enabled', type: 'boolean', default: true, isNullable: false },
          { name: 'created_at', type: 'timestamp', default: 'NOW()' },
          { name: 'updated_at', type: 'timestamp', default: 'NOW()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'hr.notifications',
      new TableIndex({
        name: 'idx_notifications_recipient_status',
        columnNames: ['recipient_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'hr.notifications',
      new TableIndex({
        name: 'idx_notifications_created_at',
        columnNames: ['created_at'],
      }),
    );

    await queryRunner.createUniqueConstraint(
      'hr.notification_preferences',
      new TableUnique({
        name: 'uq_notification_preferences_employee_type',
        columnNames: ['employee_id', 'notification_type'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS hr.notification_preferences`);
    await queryRunner.query(`DROP TABLE IF EXISTS hr.notifications`);
    await queryRunner.query(`DROP TABLE IF EXISTS hr.notification_templates`);
  }
}
