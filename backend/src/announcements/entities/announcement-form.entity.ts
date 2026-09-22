import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Announcement } from './announcement.entity';
import { AnnouncementFormResponse } from './announcement-form-response.entity';

@Entity({ schema: 'hr', name: 'announcement_forms' })
export class AnnouncementForm {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'announcement_id', type: 'uuid' })
  announcementId: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  fields: Record<string, unknown>[];

  @ManyToOne(() => Announcement, (announcement) => announcement.forms, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'announcement_id' })
  announcement: Announcement;

  @OneToMany(() => AnnouncementFormResponse, (response) => response.form)
  responses: AnnouncementFormResponse[];
}
