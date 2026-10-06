import { MigrationInterface, QueryRunner } from 'typeorm';

// R-061 (P-107): hr.sessions passa a ser a fonte única de verdade das sessões. A atividade do
// timeout por inatividade (P-096) e o hash do refresh token (decisão P107-05) saem da cache em
// memória para estas duas colunas. As linhas existentes ficam com atividade = momento da migração.
export class AddSessionActivityAndRefreshHash1842000000000 implements MigrationInterface {
  name = 'AddSessionActivityAndRefreshHash1842000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE hr.sessions
      ADD COLUMN IF NOT EXISTS last_activity_at timestamp NOT NULL DEFAULT now()
    `);
    await queryRunner.query(
      'ALTER TABLE hr.sessions ADD COLUMN IF NOT EXISTS refresh_token_hash varchar(512)',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_refresh_token_hash ON hr.sessions(refresh_token_hash)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS hr.idx_sessions_refresh_token_hash');
    await queryRunner.query('ALTER TABLE hr.sessions DROP COLUMN IF EXISTS refresh_token_hash');
    await queryRunner.query('ALTER TABLE hr.sessions DROP COLUMN IF EXISTS last_activity_at');
  }
}
