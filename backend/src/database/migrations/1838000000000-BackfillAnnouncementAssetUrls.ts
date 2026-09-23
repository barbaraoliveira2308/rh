import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Corrige assets de anúncios criados antes de P-090: `url` guardava um presigned URL do
 * MinIO com o hostname interno do Docker (irresolúvel pelo browser); passa a ser servido
 * pelo próprio backend via GET /announcements/assets/:assetId/download.
 */
export class BackfillAnnouncementAssetUrls1838000000000 implements MigrationInterface {
  name = 'BackfillAnnouncementAssetUrls1838000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE hr.announcement_assets
      SET url = '/announcements/assets/' || id || '/download'
      WHERE storage_path IS NOT NULL
        AND url NOT LIKE '/announcements/assets/%'
    `);
  }

  public async down(): Promise<void> {
    // Irreversível: o presigned URL original já expirou e não é recuperável.
  }
}
