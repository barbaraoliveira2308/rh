import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Readable } from 'stream';
import { LessThan, Repository } from 'typeorm';
import { StorageService } from '../storage/services/storage.service';
import { Announcement, AnnouncementStatus } from './entities/announcement.entity';
import { AnnouncementAsset, AnnouncementAssetType } from './entities/announcement-asset.entity';
import { AnnouncementForm } from './entities/announcement-form.entity';
import { AnnouncementFormResponse } from './entities/announcement-form-response.entity';
import {
  AnnouncementQueryDto,
  CreateAnnouncementAssetDto,
  CreateAnnouncementDto,
  CreateAnnouncementFormResponseDto,
  UpdateAnnouncementDto,
} from './dto/announcement.dto';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(Announcement)
    private readonly announcementRepository: Repository<Announcement>,
    @InjectRepository(AnnouncementAsset)
    private readonly assetRepository: Repository<AnnouncementAsset>,
    @InjectRepository(AnnouncementForm)
    private readonly formRepository: Repository<AnnouncementForm>,
    @InjectRepository(AnnouncementFormResponse)
    private readonly responseRepository: Repository<AnnouncementFormResponse>,
    private readonly storageService: StorageService,
  ) {}

  async list(query: AnnouncementQueryDto): Promise<{
    items: Announcement[];
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    const limit = Math.min(Math.max(Number.parseInt(query.limit ?? '10', 10) || 10, 1), 50);
    const cursorDate = query.cursor ? new Date(query.cursor) : null;
    const items = await this.announcementRepository.find({
      where: {
        status: query.status ?? AnnouncementStatus.PUBLISHED,
        ...(cursorDate ? { publishedAt: LessThan(cursorDate) } : {}),
      },
      relations: { author: true, assets: true, forms: true },
      order: { publishedAt: 'DESC', id: 'DESC' },
      take: limit + 1,
    });
    const hasMore = items.length > limit;
    const page = hasMore ? items.slice(0, limit) : items;
    const last = page.at(-1);
    return {
      items: page,
      nextCursor: hasMore && last?.publishedAt ? last.publishedAt.toISOString() : null,
      hasMore,
    };
  }

  async create(dto: CreateAnnouncementDto, employeeId: string): Promise<Announcement> {
    const announcement = this.announcementRepository.create({
      title: dto.title,
      body: dto.body ?? null,
      bodyBlocks: dto.bodyBlocks ?? [],
      status: AnnouncementStatus.PUBLISHED,
      publishedAt: new Date(),
      authorId: employeeId,
    });
    const saved = await this.announcementRepository.save(announcement);
    if (dto.forms) {
      await this.formRepository.save(
        dto.forms.map((form) =>
          this.formRepository.create({
            announcementId: saved.id,
            title: form.title,
            fields: form.fields,
          }),
        ),
      );
    }
    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateAnnouncementDto, employeeId: string): Promise<Announcement> {
    const announcement = await this.getOwned(id, employeeId);
    Object.assign(announcement, dto);
    return this.announcementRepository.save(announcement);
  }

  async archive(id: string, employeeId: string): Promise<void> {
    const announcement = await this.getOwned(id, employeeId);
    announcement.status = AnnouncementStatus.ARCHIVED;
    await this.announcementRepository.save(announcement);
  }

  async findOne(id: string): Promise<Announcement> {
    const announcement = await this.announcementRepository.findOne({
      where: { id },
      relations: { author: true, assets: true, forms: true },
    });
    if (!announcement) throw new NotFoundException('Comunicado não encontrado');
    return announcement;
  }

  async addLink(
    id: string,
    dto: CreateAnnouncementAssetDto,
    employeeId: string,
  ): Promise<AnnouncementAsset> {
    await this.getOwned(id, employeeId);
    return this.assetRepository.save(
      this.assetRepository.create({
        announcementId: id,
        assetType: dto.assetType,
        url: dto.url,
        storagePath: null,
        fileName: null,
        contentType: null,
        sizeBytes: null,
      }),
    );
  }

  async uploadAsset(
    id: string,
    file: Express.Multer.File,
    employeeId: string,
    assetType: CreateAnnouncementAssetDto['assetType'],
  ): Promise<AnnouncementAsset> {
    await this.getOwned(id, employeeId);
    if (assetType === AnnouncementAssetType.VIDEO && !file.mimetype.startsWith('video/')) {
      throw new BadRequestException('O ficheiro selecionado não é um vídeo válido');
    }
    if (assetType === AnnouncementAssetType.IMAGE && !file.mimetype.startsWith('image/')) {
      throw new BadRequestException('O ficheiro selecionado não é uma imagem válida');
    }
    if (
      assetType === AnnouncementAssetType.DOCUMENT &&
      (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/'))
    ) {
      throw new BadRequestException('O ficheiro selecionado não é um documento válido');
    }
    const storagePath = await this.storageService.upload(
      `announcements/${id}/${String(Date.now())}-${file.originalname}`,
      file.buffer,
      file.mimetype,
    );
    const saved = await this.assetRepository.save(
      this.assetRepository.create({
        announcementId: id,
        assetType,
        url: '',
        storagePath,
        fileName: file.originalname,
        contentType: file.mimetype,
        sizeBytes: file.size,
      }),
    );
    saved.url = `/announcements/assets/${saved.id}/download`;
    return this.assetRepository.save(saved);
  }

  async getAssetStream(
    assetId: string,
  ): Promise<{ stream: Readable; contentType: string; filename: string }> {
    const asset = await this.assetRepository.findOne({ where: { id: assetId } });
    if (!asset?.storagePath) throw new NotFoundException('Anexo não encontrado');
    const object = await this.storageService.getObjectStream(asset.storagePath);
    return {
      stream: object.body,
      contentType: asset.contentType ?? object.contentType ?? 'application/octet-stream',
      filename: asset.fileName ?? 'ficheiro',
    };
  }

  async respond(
    formId: string,
    dto: CreateAnnouncementFormResponseDto,
    employeeId: string,
  ): Promise<AnnouncementFormResponse> {
    const form = await this.formRepository.findOne({ where: { id: formId } });
    if (!form) throw new NotFoundException('Formulário não encontrado');
    return this.responseRepository.save(
      this.responseRepository.create({
        formId,
        employeeId,
        answers: dto.answers,
      }),
    );
  }

  async listResponses(formId: string, employeeId: string): Promise<AnnouncementFormResponse[]> {
    const form = await this.formRepository.findOne({
      where: { id: formId },
      relations: { announcement: true },
    });
    if (!form) throw new NotFoundException('Formulário não encontrado');
    if (form.announcement.authorId !== employeeId) {
      throw new ForbiddenException('Sem acesso às respostas deste formulário');
    }
    return this.responseRepository.find({
      where: { formId },
      relations: { employee: true },
      order: { createdAt: 'DESC' },
    });
  }

  private async getOwned(id: string, employeeId: string): Promise<Announcement> {
    const announcement = await this.announcementRepository.findOne({ where: { id } });
    if (!announcement) throw new NotFoundException('Comunicado não encontrado');
    if (announcement.authorId !== employeeId)
      throw new ForbiddenException('Sem acesso a este comunicado');
    return announcement;
  }
}
