import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateDocumentsTables1780000000000 implements MigrationInterface {
  name = 'CreateDocumentsTables1780000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        schema: 'hr',
        name: 'documents',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'name', type: 'varchar', length: '200', isNullable: false },
          { name: 'category', type: 'varchar', length: '30', isNullable: false },
          { name: 'storage_path', type: 'varchar', length: '512', isNullable: false },
          { name: 'file_type', type: 'varchar', length: '20', isNullable: false },
          { name: 'size_bytes', type: 'bigint', isNullable: false },
          { name: 'owner_id', type: 'uuid', isNullable: true },
          { name: 'is_public', type: 'boolean', default: false, isNullable: false },
          { name: 'is_template', type: 'boolean', default: false, isNullable: false },
          { name: 'uploaded_by', type: 'uuid', isNullable: false },
          { name: 'deleted_at', type: 'timestamp', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'NOW()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'hr.documents',
      new TableIndex({ name: 'idx_documents_category', columnNames: ['category'] }),
    );
    await queryRunner.createIndex(
      'hr.documents',
      new TableIndex({ name: 'idx_documents_owner_id', columnNames: ['owner_id'] }),
    );
    await queryRunner.createIndex(
      'hr.documents',
      new TableIndex({ name: 'idx_documents_uploaded_by', columnNames: ['uploaded_by'] }),
    );

    await queryRunner.createForeignKey(
      'hr.documents',
      new TableForeignKey({
        columnNames: ['owner_id'],
        referencedTableName: 'hr.employees',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'hr.documents',
      new TableForeignKey({
        columnNames: ['uploaded_by'],
        referencedTableName: 'hr.employees',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS hr.documents`);
  }
}
