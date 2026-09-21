import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMfaRecoveryCodesTable1836000000000 implements MigrationInterface {
  name = 'CreateMfaRecoveryCodesTable1836000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE hr.mfa_recovery_codes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES hr.users(id) ON DELETE CASCADE,
        code_hash varchar(128) NOT NULL,
        used_at timestamp NULL,
        created_at timestamp NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_mfa_recovery_codes_user_id ON hr.mfa_recovery_codes(user_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS hr.mfa_recovery_codes`);
  }
}
