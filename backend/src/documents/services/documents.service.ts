import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, LessThan } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Document, DocumentFileType } from '../entities/document.entity';
import { UploadDocumentDto } from '../dto/upload-document.dto';
import { StorageService } from '../../storage/services/storage.service';
import { AdminService } from '../../admin/admin.service';
import type { Readable } from 'stream';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly storageService: StorageService,
    private readonly adminService: AdminService,
  ) {}

  async upload(
    file: Express.Multer.File,
    metadata: UploadDocumentDto,
    uploadedBy: string,
  ): Promise<Document> {
    const originalName = file.originalname;
    const ext = originalName.split('.').pop()?.toLowerCase() ?? 'pdf';
    const key = `documents/${uploadedBy}/${String(Date.now())}-${originalName}`;

    await this.storageService.upload(key, file.buffer, file.mimetype);

    const document = this.documentRepository.create({
      name: metadata.name,
      category: metadata.category,
      storagePath: key,
      fileType: ext as DocumentFileType,
      sizeBytes: file.size,
      ownerId: metadata.ownerId ?? null,
      isPublic: metadata.isPublic ?? false,
      isTemplate: metadata.isTemplate ?? false,
      uploadedBy,
    });

    return this.documentRepository.save(document);
  }

  async getFileStream(
    documentId: string,
  ): Promise<{ stream: Readable; contentType: string; filename: string }> {
    const document = await this.findOne(documentId);

    if (document.deletedAt) {
      throw new NotFoundException('Documento não encontrado');
    }

    const object = await this.storageService.getObjectStream(document.storagePath);

    return {
      stream: object.body,
      contentType: object.contentType ?? 'application/octet-stream',
      filename: document.name,
    };
  }

  async moveToTrash(documentId: string): Promise<void> {
    const document = await this.findOne(documentId);

    if (document.deletedAt) {
      throw new BadRequestException('Documento já está na lixeira');
    }

    document.deletedAt = new Date();
    await this.documentRepository.save(document);
  }

  async restore(documentId: string): Promise<Document> {
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
    });
    if (!document?.deletedAt) {
      throw new NotFoundException('Documento não encontrado na lixeira');
    }

    document.deletedAt = null;
    return this.documentRepository.save(document);
  }

  async purge(documentId: string): Promise<void> {
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
    });
    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }

    await this.storageService.delete(document.storagePath);
    await this.documentRepository.remove(document);
  }

  @Cron('0 4 * * *')
  async purgeExpiredTrash(): Promise<void> {
    const settings = await this.adminService.getSettings();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - settings.documentsTrashRetentionDays);

    const expired = await this.documentRepository.find({
      where: { deletedAt: LessThan(cutoff) },
    });

    for (const document of expired) {
      await this.purge(document.id);
    }

    if (expired.length > 0) {
      this.logger.log(`Purgados ${String(expired.length)} documentos da lixeira`);
    }
  }

  async findOne(id: string): Promise<Document> {
    const document = await this.documentRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['owner', 'uploader'],
    });
    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }
    return document;
  }

  async findAll(filters?: { category?: string; ownerId?: string }): Promise<Document[]> {
    const where: Record<string, unknown> = {
      deletedAt: IsNull(),
    };

    if (filters?.category) {
      where.category = filters.category;
    }
    if (filters?.ownerId) {
      where.ownerId = filters.ownerId;
    }

    return this.documentRepository.find({
      where,
      relations: ['owner', 'uploader'],
      order: { createdAt: 'DESC' },
    });
  }
}
