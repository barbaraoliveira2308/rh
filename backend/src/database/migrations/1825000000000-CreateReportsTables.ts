import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReportsTables1825000000000 implements MigrationInterface {
  name = 'CreateReportsTables1825000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE hr.report_frequency AS ENUM ('daily', 'weekly', 'monthly');
    `);

    await queryRunner.query(`
      CREATE TYPE hr.report_job_status AS ENUM ('pending', 'processing', 'completed', 'failed');
    `);

    await queryRunner.query(`
      CREATE TYPE hr.report_format AS ENUM ('json', 'xlsx', 'pdf');
    `);

    await queryRunner.query(`
      CREATE TYPE hr.report_type AS ENUM (
        'timesheets', 'absences', 'expenses', 'project_hours',
        'team_occupancy', 'margins', 'contracts_expiring', 'audit'
      );
    `);

    await queryRunner.query(`
      CREATE TABLE hr.scheduled_reports (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(200) NOT NULL,
        report_type hr.report_type NOT NULL,
        filters jsonb NOT NULL DEFAULT '{}',
        frequency hr.report_frequency NOT NULL,
        recipients text[] NOT NULL DEFAULT '{}',
        format hr.report_format NOT NULL,
        next_run_at timestamp,
        last_run_at timestamp,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE hr.report_jobs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        scheduled_report_id uuid REFERENCES hr.scheduled_reports(id) ON DELETE SET NULL,
        report_type hr.report_type NOT NULL,
        filters jsonb NOT NULL DEFAULT '{}',
        format hr.report_format NOT NULL,
        status hr.report_job_status NOT NULL DEFAULT 'pending',
        result_url varchar(512),
        error_message text,
        row_count int,
        completed_at timestamp,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_report_jobs_status ON hr.report_jobs(status);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_report_jobs_scheduled_report_id ON hr.report_jobs(scheduled_report_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_report_jobs_scheduled_report_id;`);
    await queryRunner.query(`DROP INDEX idx_report_jobs_status;`);
    await queryRunner.query(`DROP TABLE hr.report_jobs;`);
    await queryRunner.query(`DROP TABLE hr.scheduled_reports;`);
    await queryRunner.query(`DROP TYPE hr.report_type;`);
    await queryRunner.query(`DROP TYPE hr.report_format;`);
    await queryRunner.query(`DROP TYPE hr.report_job_status;`);
    await queryRunner.query(`DROP TYPE hr.report_frequency;`);
  }
}
