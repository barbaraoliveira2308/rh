import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMfaLastUsedStepToUsers1837000000000 implements MigrationInterface {
  name = 'AddMfaLastUsedStepToUsers1837000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE hr.users ADD COLUMN mfa_last_used_step integer NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE hr.users DROP COLUMN IF EXISTS mfa_last_used_step`);
  }
}
