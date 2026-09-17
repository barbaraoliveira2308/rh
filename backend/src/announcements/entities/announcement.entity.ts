import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Employee } from '../../users/entities/employee.entity';
import { AnnouncementAsset } from './announcement-asset.entity';
import { AnnouncementForm } from './announcement-form.entity';

export enum AnnouncementStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Entity({ schema: 'hr', name: 'announcements' })
export class Announcement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  @Column({ name: 'body_blocks', type: 'jsonb', default: () => "'[]'::jsonb" })
  bodyBlocks: Record<string, unknown>[];

  @Column({ type: 'varchar', length: 20, default: AnnouncementStatus.DRAFT })
  status: AnnouncementStatus;

  @Column({ name: 'published_at', type: 'timestamp', nullable: true })
  publishedAt: Date | null;

  @Column({ name: 'author_id', type: 'uuid' })
  authorId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => Employee, { nullable: false })
  @JoinColumn({ name: 'author_id' })
  author: Employee;

  @OneToMany(() => AnnouncementAsset, (asset) => asset.announcement)
  assets: AnnouncementAsset[];

  @OneToMany(() => AnnouncementForm, (form) => form.announcement)
  forms: AnnouncementForm[];
}
