import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePasswordHistoryTable1834000000000 implements MigrationInterface {
  name = 'CreatePasswordHistoryTable1834000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE hr.password_history (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES hr.users(id) ON DELETE CASCADE,
        password_hash varchar(255) NOT NULL,
        created_at timestamp NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_password_history_user_id ON hr.password_history(user_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS hr.password_history`);
  }
}
