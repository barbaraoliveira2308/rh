import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Employee } from '../../users/entities/employee.entity';

export enum DocumentCategory {
  CONTRACT = 'contract',
  ID = 'id',
  TRAINING = 'training',
  ABSENCE = 'absence',
  INSURANCE = 'insurance',
  ONBOARDING = 'onboarding',
  EQUIPMENT = 'equipment',
}

export enum DocumentFileType {
  PDF = 'pdf',
  DOC = 'doc',
  DOCX = 'docx',
  XLS = 'xls',
  XLSX = 'xlsx',
  PNG = 'png',
  JPG = 'jpg',
  ZIP = 'zip',
}

@Entity({ schema: 'hr', name: 'documents' })
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 30, nullable: false })
  category: DocumentCategory;

  @Column({ name: 'storage_path', type: 'varchar', length: 512, nullable: false })
  storagePath: string;

  @Column({ name: 'file_type', type: 'varchar', length: 20, nullable: false })
  fileType: DocumentFileType;

  @Column({ name: 'size_bytes', type: 'bigint', nullable: false })
  sizeBytes: number;

  @Column({ name: 'owner_id', type: 'uuid', nullable: true })
  ownerId: string | null;

  @Column({ name: 'is_public', type: 'boolean', default: false })
  isPublic: boolean;

  @Column({ name: 'is_template', type: 'boolean', default: false })
  isTemplate: boolean;

  @Column({ name: 'uploaded_by', type: 'uuid', nullable: false })
  uploadedBy: string;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'owner_id' })
  owner: Employee | null;

  @ManyToOne(() => Employee, { nullable: false })
  @JoinColumn({ name: 'uploaded_by' })
  uploader: Employee;
}
