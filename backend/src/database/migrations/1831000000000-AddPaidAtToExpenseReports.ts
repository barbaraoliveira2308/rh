import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaidAtToExpenseReports1831000000000 implements MigrationInterface {
  name = 'AddPaidAtToExpenseReports1831000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE hr.expense_reports ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE hr.expense_reports DROP COLUMN IF EXISTS paid_at`);
  }
}
