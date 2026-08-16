import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAnonymizedAtToEmployees1833000000000 implements MigrationInterface {
  name = 'AddAnonymizedAtToEmployees1833000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE hr.employees ADD COLUMN IF NOT EXISTS anonymized_at TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE hr.employees DROP COLUMN IF EXISTS anonymized_at`);
  }
}
