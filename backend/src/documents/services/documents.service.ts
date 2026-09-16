/// <reference types="multer" />

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, LessThan, In } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Document, DocumentFileType } from '../entities/document.entity';
import { UploadDocumentDto } from '../dto/upload-document.dto';
import { StorageService } from '../../storage/services/storage.service';
import { AdminService } from '../../admin/admin.service';
import { Employee } from '../../users/entities/employee.entity';
import { RoleEnum } from '../../rbac/enums/role.enum';
import type { Readable } from 'stream';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
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
    roles: string[],
    userId: string,
  ): Promise<{ stream: Readable; contentType: string; filename: string }> {
    const document = await this.findOne(documentId, roles, userId);

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
    const document = await this.documentRepository.findOne({ where: { id: documentId } });
    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }

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

  async findOne(id: string, roles: string[], userId: string): Promise<Document> {
    const document = await this.documentRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['owner', 'uploader'],
    });
    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }

    await this.assertVisible(document, roles, userId);

    return document;
  }

  async findAll(
    filters: { category?: string; ownerId?: string } | undefined,
    roles: string[],
    userId: string,
  ): Promise<Document[]> {
    const visibleOwnerIds = await this.resolveVisibleOwnerIds(roles, userId);

    if (
      filters?.ownerId &&
      visibleOwnerIds !== 'all' &&
      !visibleOwnerIds.includes(filters.ownerId)
    ) {
      throw new ForbiddenException('Sem acesso aos documentos deste colaborador');
    }

    const base: Record<string, unknown> = {
      deletedAt: IsNull(),
    };
    if (filters?.category) {
      base.category = filters.category;
    }
    if (filters?.ownerId) {
      base.ownerId = filters.ownerId;
    }

    const where: Record<string, unknown> | Record<string, unknown>[] =
      visibleOwnerIds === 'all'
        ? base
        : [
            { ...base, isPublic: true },
            { ...base, isPublic: false, ownerId: filters?.ownerId ?? In(visibleOwnerIds) },
          ];

    return this.documentRepository.find({
      where,
      relations: ['owner', 'uploader'],
      order: { createdAt: 'DESC' },
    });
  }

  private async assertVisible(document: Document, roles: string[], userId: string): Promise<void> {
    if (document.isPublic) {
      return;
    }

    const visibleOwnerIds = await this.resolveVisibleOwnerIds(roles, userId);
    if (visibleOwnerIds === 'all') {
      return;
    }

    if (!document.ownerId || !visibleOwnerIds.includes(document.ownerId)) {
      throw new NotFoundException('Documento não encontrado');
    }
  }

  private async resolveVisibleOwnerIds(roles: string[], userId: string): Promise<string[] | 'all'> {
    if (roles.includes(RoleEnum.ADMIN)) {
      return 'all';
    }

    const caller = await this.employeeRepository.findOne({ where: { userId } });
    if (!caller) {
      throw new ForbiddenException('Colaborador não encontrado para o utilizador autenticado');
    }

    if (roles.includes(RoleEnum.MANAGER)) {
      const directReports = await this.employeeRepository.find({
        where: { managerId: caller.id },
        select: ['id'],
      });
      return [caller.id, ...directReports.map((employee) => employee.id)];
    }

    return [caller.id];
  }
}
