import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdminTables1830000000000 implements MigrationInterface {
  name = 'CreateAdminTables1830000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE hr.system_settings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        company_name varchar(200) NOT NULL DEFAULT 'Bridge351',
        default_country varchar(5) NOT NULL DEFAULT 'PT',
        default_currency varchar(5) NOT NULL DEFAULT 'EUR',
        default_vacation_days_per_year int NOT NULL DEFAULT 22,
        carry_over_vacation_days int NOT NULL DEFAULT 5,
        timesheet_submission_deadline_day int NOT NULL DEFAULT 5,
        default_daily_hours decimal(4,2) NOT NULL DEFAULT 8.0,
        contract_expiry_alert_days int NOT NULL DEFAULT 30,
        project_end_alert_days int NOT NULL DEFAULT 30,
        underallocation_threshold_percentage decimal(5,2) NOT NULL DEFAULT 80.0,
        session_timeout_minutes int NOT NULL DEFAULT 30,
        max_login_attempts int NOT NULL DEFAULT 5,
        lockout_period_minutes int NOT NULL DEFAULT 15,
        mfa_required_for_admin boolean NOT NULL DEFAULT true,
        gdpr_post_exit_retention_years int NOT NULL DEFAULT 5,
        documents_trash_retention_days int NOT NULL DEFAULT 30,
        updated_at timestamp NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      INSERT INTO hr.system_settings (id) VALUES (gen_random_uuid());
    `);

    await queryRunner.query(`
      CREATE TABLE hr.legal_entities (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(200) NOT NULL,
        nif varchar(30) UNIQUE,
        country varchar(5) NOT NULL,
        currency varchar(5) NOT NULL,
        calendar_profile_country_code varchar(5) NOT NULL,
        vacation_days_per_year_override int,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      INSERT INTO hr.legal_entities (name, country, currency, calendar_profile_country_code)
      VALUES
        ('Bridge351', 'PT', 'EUR', 'PT'),
        ('NIVVOS', 'PT', 'EUR', 'PT');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE hr.legal_entities;`);
    await queryRunner.query(`DROP TABLE hr.system_settings;`);
  }
}
