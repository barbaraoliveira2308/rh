import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCourseIdToDocuments1841000000000 implements MigrationInterface {
  name = 'AddCourseIdToDocuments1841000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE hr.documents
      ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES hr.courses(id) ON DELETE CASCADE
    `);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_documents_course ON hr.documents(course_id)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS hr.idx_documents_course');
    await queryRunner.query('ALTER TABLE hr.documents DROP COLUMN IF EXISTS course_id');
  }
}
