import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePolicyAcceptances1839000000000 implements MigrationInterface {
  name = 'CreatePolicyAcceptances1839000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS hr.policy_acceptances (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id uuid NOT NULL REFERENCES hr.users(id) ON DELETE CASCADE,
        policy_id uuid NOT NULL REFERENCES hr.policies(id) ON DELETE CASCADE,
        policy_version integer NOT NULL,
        accepted_at timestamp NOT NULL DEFAULT now(),
        CONSTRAINT uq_policy_acceptance_user_policy UNIQUE (user_id, policy_id)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_policy_acceptances_policy ON hr.policy_acceptances(policy_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_policy_acceptances_user ON hr.policy_acceptances(user_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS hr.policy_acceptances');
  }
}
