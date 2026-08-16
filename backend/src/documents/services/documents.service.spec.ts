import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In } from 'typeorm';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { Document } from '../entities/document.entity';
import { Employee } from '../../users/entities/employee.entity';
import { StorageService } from '../../storage/services/storage.service';
import { AdminService } from '../../admin/admin.service';
import { RoleEnum } from '../../rbac/enums/role.enum';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let mockDocumentRepo: Record<string, jest.Mock>;
  let mockEmployeeRepo: Record<string, jest.Mock>;
  let mockStorageService: Record<string, jest.Mock>;
  let mockAdminService: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockDocumentRepo = {
      create: jest.fn((data: Partial<Document>) => data),
      save: jest.fn((data: Partial<Document>) => Promise.resolve(data)),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    mockEmployeeRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
    };
    mockStorageService = {
      upload: jest.fn().mockResolvedValue('documents/u-1/key'),
      getObjectStream: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    mockAdminService = {
      getSettings: jest.fn().mockResolvedValue({ documentsTrashRetentionDays: 30 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: getRepositoryToken(Document), useValue: mockDocumentRepo },
        { provide: getRepositoryToken(Employee), useValue: mockEmployeeRepo },
        { provide: StorageService, useValue: mockStorageService },
        { provide: AdminService, useValue: mockAdminService },
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

      await expect(service.getFileStream('d-1', [RoleEnum.ADMIN], 'u-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve devolver o stream do storage com o nome e content-type do documento', async () => {
      mockDocumentRepo.findOne.mockResolvedValue({
        id: 'd-1',
        deletedAt: null,
        storagePath: 'documents/x',
        name: 'Contrato.pdf',
        isPublic: true,
      });
      const stream = { pipe: jest.fn() };
      mockStorageService.getObjectStream.mockResolvedValue({
        body: stream,
        contentType: 'application/pdf',
      });

      const result = await service.getFileStream('d-1', [RoleEnum.ADMIN], 'u-1');

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
        isPublic: true,
      });
      const stream = { pipe: jest.fn() };
      mockStorageService.getObjectStream.mockResolvedValue({
        body: stream,
        contentType: undefined,
      });

      const result = await service.getFileStream('d-1', [RoleEnum.ADMIN], 'u-1');

      expect(result.contentType).toBe('application/octet-stream');
    });

    it('deve lançar NotFoundException ao tentar descarregar documento privado de outro colaborador', async () => {
      mockDocumentRepo.findOne.mockResolvedValue({
        id: 'd-1',
        deletedAt: null,
        storagePath: 'documents/x',
        name: 'Contrato.pdf',
        isPublic: false,
        ownerId: 'e-owner',
      });
      mockEmployeeRepo.findOne.mockResolvedValue({ id: 'e-2', managerId: null });

      await expect(service.getFileStream('d-1', [RoleEnum.EMPLOYEE], 'u-2')).rejects.toThrow(
        NotFoundException,
      );
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

  describe('purgeExpiredTrash', () => {
    it('deve purgar documentos cujo deletedAt ultrapassa documentsTrashRetentionDays', async () => {
      mockAdminService.getSettings.mockResolvedValue({ documentsTrashRetentionDays: 30 });
      const expiredDocs = [
        { id: 'd-1', storagePath: 'documents/d-1' },
        { id: 'd-2', storagePath: 'documents/d-2' },
      ];
      mockDocumentRepo.find.mockResolvedValue(expiredDocs);
      mockDocumentRepo.findOne.mockImplementation(({ where }: { where: { id: string } }) =>
        Promise.resolve(expiredDocs.find((doc) => doc.id === where.id) ?? null),
      );

      await service.purgeExpiredTrash();

      expect(mockAdminService.getSettings).toHaveBeenCalled();
      expect(mockStorageService.delete).toHaveBeenCalledWith('documents/d-1');
      expect(mockStorageService.delete).toHaveBeenCalledWith('documents/d-2');
      expect(mockDocumentRepo.remove).toHaveBeenCalledTimes(2);
    });

    it('não deve chamar purge quando não há documentos expirados', async () => {
      mockDocumentRepo.find.mockResolvedValue([]);

      await service.purgeExpiredTrash();

      expect(mockStorageService.delete).not.toHaveBeenCalled();
      expect(mockDocumentRepo.remove).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('deve filtrar por categoria e proprietário quando fornecidos (Admin vê tudo)', async () => {
      mockDocumentRepo.find.mockResolvedValue([]);

      await service.findAll({ category: 'contract', ownerId: 'e-1' }, [RoleEnum.ADMIN], 'u-1');

      expect(mockDocumentRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: 'contract', ownerId: 'e-1' }) as Record<
            string,
            unknown
          >,
        }),
      );
    });

    it('deve restringir a resultados públicos ou do próprio colaborador para Employee', async () => {
      mockDocumentRepo.find.mockResolvedValue([]);
      mockEmployeeRepo.findOne.mockResolvedValue({ id: 'e-1', managerId: null });

      await service.findAll(undefined, [RoleEnum.EMPLOYEE], 'u-1');

      expect(mockDocumentRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: [
            expect.objectContaining({ isPublic: true }) as Record<string, unknown>,
            expect.objectContaining({ isPublic: false, ownerId: In(['e-1']) }) as Record<
              string,
              unknown
            >,
          ],
        }),
      );
    });

    it('deve lançar ForbiddenException se Employee pedir documentos de outro colaborador', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue({ id: 'e-1', managerId: null });

      await expect(
        service.findAll({ ownerId: 'e-outro' }, [RoleEnum.EMPLOYEE], 'u-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne (controlo de acesso)', () => {
    it('deve permitir a um Manager ver documento privado de um membro da sua equipa', async () => {
      mockDocumentRepo.findOne.mockResolvedValue({
        id: 'd-1',
        deletedAt: null,
        isPublic: false,
        ownerId: 'e-report',
      });
      mockEmployeeRepo.findOne.mockResolvedValue({ id: 'e-manager', managerId: null });
      mockEmployeeRepo.find.mockResolvedValue([{ id: 'e-report' }]);

      const result = await service.findOne('d-1', [RoleEnum.MANAGER], 'u-manager');

      expect(result.id).toBe('d-1');
    });

    it('deve lançar NotFoundException se Employee tentar ver documento privado de outro colaborador', async () => {
      mockDocumentRepo.findOne.mockResolvedValue({
        id: 'd-1',
        deletedAt: null,
        isPublic: false,
        ownerId: 'e-outro',
      });
      mockEmployeeRepo.findOne.mockResolvedValue({ id: 'e-1', managerId: null });

      await expect(service.findOne('d-1', [RoleEnum.EMPLOYEE], 'u-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve permitir a qualquer papel ver documento público', async () => {
      mockDocumentRepo.findOne.mockResolvedValue({
        id: 'd-1',
        deletedAt: null,
        isPublic: true,
        ownerId: 'e-outro',
      });

      const result = await service.findOne('d-1', [RoleEnum.EMPLOYEE], 'u-1');

      expect(result.id).toBe('d-1');
      expect(mockEmployeeRepo.findOne).not.toHaveBeenCalled();
    });
  });
});
