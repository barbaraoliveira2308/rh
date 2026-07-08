import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCalendarTables1824000000000 implements MigrationInterface {
  name = 'CreateCalendarTables1824000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE hr.blocked_period_scope AS ENUM ('absences', 'timesheets', 'all');
    `);

    await queryRunner.query(`
      CREATE TYPE hr.company_event_type AS ENUM ('bridge351', 'nivvos', 'company', 'other');
    `);

    await queryRunner.query(`
      CREATE TABLE hr.public_holidays (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        country_code varchar(5) NOT NULL,
        holiday_date date NOT NULL,
        name varchar(200) NOT NULL,
        local_name varchar(200),
        global boolean NOT NULL DEFAULT false,
        region varchar(100),
        type varchar(50),
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        CONSTRAINT uq_public_holidays_country_date UNIQUE (country_code, holiday_date)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE hr.company_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        title varchar(200) NOT NULL,
        description text,
        start_date date NOT NULL,
        end_date date,
        type hr.company_event_type NOT NULL DEFAULT 'company',
        color varchar(7),
        is_recurring boolean NOT NULL DEFAULT false,
        created_by uuid NOT NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE hr.blocked_periods (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        reason varchar(200) NOT NULL,
        start_date date NOT NULL,
        end_date date NOT NULL,
        scope hr.blocked_period_scope NOT NULL DEFAULT 'all',
        created_by uuid NOT NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        CONSTRAINT chk_blocked_periods_dates CHECK (end_date >= start_date)
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE hr.blocked_periods;`);
    await queryRunner.query(`DROP TABLE hr.company_events;`);
    await queryRunner.query(`DROP TABLE hr.public_holidays;`);
    await queryRunner.query(`DROP TYPE hr.company_event_type;`);
    await queryRunner.query(`DROP TYPE hr.blocked_period_scope;`);
  }
}
