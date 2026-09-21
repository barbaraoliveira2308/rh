import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Announcement } from './announcement.entity';

export enum AnnouncementAssetType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
  LINK = 'link',
}

@Entity({ schema: 'hr', name: 'announcement_assets' })
export class AnnouncementAsset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'announcement_id', type: 'uuid' })
  announcementId: string;

  @Column({ name: 'asset_type', type: 'varchar', length: 20 })
  assetType: AnnouncementAssetType;

  @Column({ type: 'varchar', length: 512 })
  url: string;

  @Column({ name: 'storage_path', type: 'varchar', length: 512, nullable: true })
  storagePath: string | null;

  @Column({ name: 'file_name', type: 'varchar', length: 255, nullable: true })
  fileName: string | null;

  @Column({ name: 'content_type', type: 'varchar', length: 150, nullable: true })
  contentType: string | null;

  @Column({ name: 'size_bytes', type: 'bigint', nullable: true })
  sizeBytes: number | null;

  @ManyToOne(() => Announcement, (announcement) => announcement.assets, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'announcement_id' })
  announcement: Announcement;
}
