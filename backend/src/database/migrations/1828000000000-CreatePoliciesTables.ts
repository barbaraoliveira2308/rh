import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePoliciesTables1828000000000 implements MigrationInterface {
  name = 'CreatePoliciesTables1828000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE hr.policy_status AS ENUM ('draft', 'published', 'archived');
    `);

    await queryRunner.query(`
      CREATE TABLE hr.policies (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        title varchar(200) NOT NULL,
        content text NOT NULL,
        category varchar(100) NOT NULL,
        status hr.policy_status NOT NULL DEFAULT 'draft',
        author_id uuid REFERENCES hr.employees(id) ON DELETE SET NULL,
        published_at timestamp,
        version int NOT NULL DEFAULT 1,
        parent_id uuid REFERENCES hr.policies(id) ON DELETE SET NULL,
        tags jsonb,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_policies_category ON hr.policies(category);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_policies_status ON hr.policies(status);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_policies_parent_id ON hr.policies(parent_id);
    `);

    await queryRunner.query(`
      ALTER TABLE hr.policies ADD COLUMN content_tsv tsvector
        GENERATED ALWAYS AS (to_tsvector('portuguese', coalesce(content, ''))) STORED;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_policies_content_tsv ON hr.policies USING GIN (content_tsv);
    `);

    await queryRunner.query(`
      ALTER TABLE hr.policies ADD COLUMN title_tsv tsvector
        GENERATED ALWAYS AS (to_tsvector('portuguese', coalesce(title, ''))) STORED;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_policies_title_tsv ON hr.policies USING GIN (title_tsv);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_policies_title_tsv;`);
    await queryRunner.query(`DROP INDEX idx_policies_content_tsv;`);
    await queryRunner.query(`DROP INDEX idx_policies_parent_id;`);
    await queryRunner.query(`DROP INDEX idx_policies_status;`);
    await queryRunner.query(`DROP INDEX idx_policies_category;`);
    await queryRunner.query(`ALTER TABLE hr.policies DROP COLUMN title_tsv;`);
    await queryRunner.query(`ALTER TABLE hr.policies DROP COLUMN content_tsv;`);
    await queryRunner.query(`DROP TABLE hr.policies;`);
    await queryRunner.query(`DROP TYPE hr.policy_status;`);
  }
}
