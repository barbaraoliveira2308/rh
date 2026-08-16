import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLegalEntityIdToContracts1832000000000 implements MigrationInterface {
  name = 'AddLegalEntityIdToContracts1832000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE hr.contracts ADD COLUMN IF NOT EXISTS legal_entity_id UUID NULL REFERENCES hr.legal_entities(id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE hr.contracts DROP COLUMN IF EXISTS legal_entity_id`);
  }
}
