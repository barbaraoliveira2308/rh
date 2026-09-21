import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOpenOpportunities1837000000000 implements MigrationInterface {
  name = 'CreateOpenOpportunities1837000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS hr.open_opportunities (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        title varchar(200) NOT NULL,
        description text,
        location varchar(120),
        status varchar(20) NOT NULL DEFAULT 'open',
        skills jsonb NOT NULL DEFAULT '[]'::jsonb,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_open_opportunities_status ON hr.open_opportunities(status, created_at DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS hr.open_opportunities');
  }
}
