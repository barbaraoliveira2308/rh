import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPriorityAndDueDateToWorkflowItems1835000000000 implements MigrationInterface {
  name = 'AddPriorityAndDueDateToWorkflowItems1835000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE hr.workflow_items ADD COLUMN IF NOT EXISTS priority VARCHAR(10) NOT NULL DEFAULT 'NORMAL'`,
    );
    await queryRunner.query(
      `ALTER TABLE hr.workflow_items ADD COLUMN IF NOT EXISTS due_date TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE hr.workflow_items ADD COLUMN IF NOT EXISTS is_overdue BOOLEAN NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE hr.workflow_items DROP COLUMN IF EXISTS priority`);
    await queryRunner.query(`ALTER TABLE hr.workflow_items DROP COLUMN IF EXISTS due_date`);
    await queryRunner.query(`ALTER TABLE hr.workflow_items DROP COLUMN IF EXISTS is_overdue`);
  }
}
