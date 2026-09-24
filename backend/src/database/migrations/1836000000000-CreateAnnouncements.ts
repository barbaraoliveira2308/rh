import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAnnouncements1836000000000 implements MigrationInterface {
  name = 'CreateAnnouncements1836000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS hr.announcements (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        title varchar(200) NOT NULL,
        body text,
        body_blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
        status varchar(20) NOT NULL DEFAULT 'draft',
        published_at timestamp,
        author_id uuid NOT NULL REFERENCES hr.employees(id),
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_announcements_feed ON hr.announcements(status, published_at DESC, id DESC)`,
    );
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS hr.announcement_assets (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        announcement_id uuid NOT NULL REFERENCES hr.announcements(id) ON DELETE CASCADE,
        asset_type varchar(20) NOT NULL,
        url varchar(512) NOT NULL,
        storage_path varchar(512),
        file_name varchar(255),
        content_type varchar(150),
        size_bytes bigint
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS hr.announcement_forms (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        announcement_id uuid NOT NULL REFERENCES hr.announcements(id) ON DELETE CASCADE,
        title varchar(200) NOT NULL,
        fields jsonb NOT NULL DEFAULT '[]'::jsonb
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS hr.announcement_form_responses (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        form_id uuid NOT NULL REFERENCES hr.announcement_forms(id) ON DELETE CASCADE,
        employee_id uuid NOT NULL REFERENCES hr.employees(id),
        answers jsonb NOT NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        UNIQUE(form_id, employee_id)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS hr.announcement_form_responses');
    await queryRunner.query('DROP TABLE IF EXISTS hr.announcement_forms');
    await queryRunner.query('DROP TABLE IF EXISTS hr.announcement_assets');
    await queryRunner.query('DROP TABLE IF EXISTS hr.announcements');
  }
}
