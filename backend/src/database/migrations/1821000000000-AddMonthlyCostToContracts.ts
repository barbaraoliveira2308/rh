import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMonthlyCostToContracts1821000000000 implements MigrationInterface {
  name = 'AddMonthlyCostToContracts1821000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE hr.contracts ADD COLUMN IF NOT EXISTS monthly_cost DECIMAL(12, 2)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE hr.contracts DROP COLUMN IF EXISTS monthly_cost`);
  }
}
