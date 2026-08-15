import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { Document } from '../entities/document.entity';
import { StorageService } from '../../storage/services/storage.service';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let mockDocumentRepo: Record<string, jest.Mock>;
  let mockStorageService: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockDocumentRepo = {
      create: jest.fn((data: Partial<Document>) => data),
      save: jest.fn((data: Partial<Document>) => Promise.resolve(data)),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    mockStorageService = {
      upload: jest.fn().mockResolvedValue('documents/u-1/key'),
      getObjectStream: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: getRepositoryToken(Document), useValue: mockDocumentRepo },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  describe('upload', () => {
    it('deve enviar o ficheiro para o storage e criar o registo do documento', async () => {
      const file = {
        originalname: 'contrato.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('conteúdo'),
      } as Express.Multer.File;

      const result = await service.upload(
        file,
        { name: 'Contrato', category: 'contract', ownerId: 'e-1' } as never,
        'u-1',
      );

      expect(mockStorageService.upload).toHaveBeenCalledWith(
        expect.stringContaining('documents/u-1/'),
        file.buffer,
        'application/pdf',
      );
      expect(result).toEqual(
        expect.objectContaining({
          name: 'Contrato',
          fileType: 'pdf',
          sizeBytes: 1024,
          ownerId: 'e-1',
          uploadedBy: 'u-1',
        }),
      );
    });

    it('deve usar o nome completo em minúsculas como extensão quando não há ponto no nome do ficheiro', async () => {
      const file = {
        originalname: 'SemExtensao',
        mimetype: 'application/octet-stream',
        size: 10,
        buffer: Buffer.from('x'),
      } as Express.Multer.File;

      const result = await service.upload(file, { name: 'Sem Extensão' } as never, 'u-1');

      expect(result).toEqual(expect.objectContaining({ fileType: 'semextensao' }));
    });
  });

  describe('getFileStream', () => {
    it('deve lançar NotFoundException se o documento estiver na lixeira', async () => {
      mockDocumentRepo.findOne.mockResolvedValue({
        id: 'd-1',
        deletedAt: new Date(),
        storagePath: 'documents/x',
      });

      await expect(service.getFileStream('d-1')).rejects.toThrow(NotFoundException);
    });

    it('deve devolver o stream do storage com o nome e content-type do documento', async () => {
      mockDocumentRepo.findOne.mockResolvedValue({
        id: 'd-1',
        deletedAt: null,
        storagePath: 'documents/x',
        name: 'Contrato.pdf',
      });
      const stream = { pipe: jest.fn() };
      mockStorageService.getObjectStream.mockResolvedValue({
        body: stream,
        contentType: 'application/pdf',
      });

      const result = await service.getFileStream('d-1');

      expect(mockStorageService.getObjectStream).toHaveBeenCalledWith('documents/x');
      expect(result).toEqual({
        stream,
        contentType: 'application/pdf',
        filename: 'Contrato.pdf',
      });
    });

    it('deve usar application/octet-stream quando o storage não devolve content-type', async () => {
      mockDocumentRepo.findOne.mockResolvedValue({
        id: 'd-1',
        deletedAt: null,
        storagePath: 'documents/x',
        name: 'Contrato.pdf',
      });
      const stream = { pipe: jest.fn() };
      mockStorageService.getObjectStream.mockResolvedValue({
        body: stream,
        contentType: undefined,
      });

      const result = await service.getFileStream('d-1');

      expect(result.contentType).toBe('application/octet-stream');
    });
  });

  describe('moveToTrash', () => {
    it('deve lançar BadRequestException se o documento já estiver na lixeira', async () => {
      mockDocumentRepo.findOne.mockResolvedValue({ id: 'd-1', deletedAt: new Date() });

      await expect(service.moveToTrash('d-1')).rejects.toThrow(BadRequestException);
    });

    it('deve definir deletedAt no documento', async () => {
      mockDocumentRepo.findOne.mockResolvedValue({ id: 'd-1', deletedAt: null });

      await service.moveToTrash('d-1');

      expect(mockDocumentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: expect.any(Date) as Date }),
      );
    });
  });

  describe('restore', () => {
    it('deve lançar NotFoundException se o documento não estiver na lixeira', async () => {
      mockDocumentRepo.findOne.mockResolvedValue({ id: 'd-1', deletedAt: null });

      await expect(service.restore('d-1')).rejects.toThrow(NotFoundException);
    });

    it('deve limpar deletedAt ao restaurar', async () => {
      mockDocumentRepo.findOne.mockResolvedValue({ id: 'd-1', deletedAt: new Date() });

      const result = await service.restore('d-1');

      expect(result.deletedAt).toBeNull();
    });
  });

  describe('purge', () => {
    it('deve lançar NotFoundException se o documento não existir', async () => {
      mockDocumentRepo.findOne.mockResolvedValue(null);

      await expect(service.purge('missing')).rejects.toThrow(NotFoundException);
    });

    it('deve eliminar o ficheiro do storage e remover o registo', async () => {
      const document = { id: 'd-1', storagePath: 'documents/x' };
      mockDocumentRepo.findOne.mockResolvedValue(document);

      await service.purge('d-1');

      expect(mockStorageService.delete).toHaveBeenCalledWith('documents/x');
      expect(mockDocumentRepo.remove).toHaveBeenCalledWith(document);
    });
  });

  describe('findAll', () => {
    it('deve filtrar por categoria e proprietário quando fornecidos', async () => {
      mockDocumentRepo.find.mockResolvedValue([]);

      await service.findAll({ category: 'contract', ownerId: 'e-1' });

      expect(mockDocumentRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: 'contract', ownerId: 'e-1' }) as Record<
            string,
            unknown
          >,
        }),
      );
    });
  });
});
