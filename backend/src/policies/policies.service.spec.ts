import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PoliciesService } from './policies.service';
import { Policy } from './entities/policy.entity';
import { PolicyStatus } from './entities/policy-status.enum';

describe('PoliciesService', () => {
  let service: PoliciesService;
  let mockPolicyRepo: Record<string, jest.Mock>;
  let mockQueryBuilder: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    mockPolicyRepo = {
      create: jest.fn((data: Partial<Policy>) => data),
      save: jest.fn((data: Partial<Policy>) => Promise.resolve(data)),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoliciesService,
        { provide: getRepositoryToken(Policy), useValue: mockPolicyRepo },
      ],
    }).compile();

    service = module.get<PoliciesService>(PoliciesService);
  });

  describe('create', () => {
    it('deve criar a política como DRAFT na versão 1', async () => {
      const result = await service.create(
        { title: 'Política de Férias', content: 'Conteúdo', category: 'rh' },
        'author-1',
      );

      expect(result).toEqual(
        expect.objectContaining({
          title: 'Política de Férias',
          status: PolicyStatus.DRAFT,
          version: 1,
          authorId: 'author-1',
        }),
      );
    });
  });

  describe('findAll', () => {
    it('deve filtrar sempre por políticas publicadas', async () => {
      await service.findAll();

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('p.status = :status', {
        status: PolicyStatus.PUBLISHED,
      });
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('deve aplicar pesquisa full-text quando q for fornecido', async () => {
      await service.findAll('férias');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('plainto_tsquery'),
        { q: 'férias' },
      );
    });

    it('deve filtrar por categoria quando fornecida', async () => {
      await service.findAll(undefined, 'rh');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('p.category = :category', {
        category: 'rh',
      });
    });

    it('não deve aplicar pesquisa full-text para uma query só com espaços', async () => {
      await service.findAll('   ');

      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('plainto_tsquery'),
        expect.anything(),
      );
    });
  });

  describe('findOne', () => {
    it('deve lançar NotFoundException se a política não existir', async () => {
      mockPolicyRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });

    it('deve devolver a política encontrada', async () => {
      const policy = { id: 'p-1', title: 'Política' } as Policy;
      mockPolicyRepo.findOne.mockResolvedValue(policy);

      const result = await service.findOne('p-1');

      expect(result).toBe(policy);
    });
  });

  describe('findVersions', () => {
    it('deve procurar por id quando a política é a raiz (sem parentId)', async () => {
      mockPolicyRepo.findOne.mockResolvedValue({ id: 'p-1', parentId: null });
      mockPolicyRepo.find.mockResolvedValue([]);

      await service.findVersions('p-1');

      expect(mockPolicyRepo.find).toHaveBeenCalledWith({
        where: [{ id: 'p-1' }, { parentId: 'p-1' }],
        order: { version: 'DESC' },
      });
    });

    it('deve procurar pelo parentId quando a política é uma versão derivada', async () => {
      mockPolicyRepo.findOne.mockResolvedValue({ id: 'p-2', parentId: 'p-1' });
      mockPolicyRepo.find.mockResolvedValue([]);

      await service.findVersions('p-2');

      expect(mockPolicyRepo.find).toHaveBeenCalledWith({
        where: [{ id: 'p-1' }, { parentId: 'p-1' }],
        order: { version: 'DESC' },
      });
    });
  });

  describe('update', () => {
    it('deve criar uma nova versão em DRAFT incrementando o número de versão', async () => {
      mockPolicyRepo.findOne.mockResolvedValue({
        id: 'p-1',
        title: 'Original',
        content: 'Conteúdo original',
        category: 'rh',
        authorId: 'author-1',
        version: 2,
        parentId: null,
        tags: ['rh'],
      });

      const result = await service.update('p-1', { title: 'Atualizada' });

      expect(result).toEqual(
        expect.objectContaining({
          title: 'Atualizada',
          content: 'Conteúdo original',
          status: PolicyStatus.DRAFT,
          version: 3,
          parentId: 'p-1',
        }),
      );
    });

    it('deve manter o parentId original ao atualizar uma versão já derivada', async () => {
      mockPolicyRepo.findOne.mockResolvedValue({
        id: 'p-2',
        title: 'V2',
        content: 'Conteúdo',
        category: 'rh',
        authorId: 'author-1',
        version: 2,
        parentId: 'p-1',
        tags: null,
      });

      const result = await service.update('p-2', {});

      expect(result).toEqual(expect.objectContaining({ parentId: 'p-1', version: 3 }));
    });
  });

  describe('publish', () => {
    it('deve lançar BadRequestException se a política estiver arquivada', async () => {
      mockPolicyRepo.findOne.mockResolvedValue({
        id: 'p-1',
        status: PolicyStatus.ARCHIVED,
      });

      await expect(service.publish('p-1')).rejects.toThrow(BadRequestException);
    });

    it('deve publicar a política e definir publishedAt', async () => {
      mockPolicyRepo.findOne.mockResolvedValue({
        id: 'p-1',
        status: PolicyStatus.DRAFT,
      });

      const result = await service.publish('p-1');

      expect(result.status).toBe(PolicyStatus.PUBLISHED);
      expect(result.publishedAt).toBeInstanceOf(Date);
    });
  });

  describe('archive', () => {
    it('deve arquivar a política', async () => {
      const policy = { id: 'p-1', status: PolicyStatus.PUBLISHED } as Policy;
      mockPolicyRepo.findOne.mockResolvedValue(policy);

      await service.archive('p-1');

      expect(mockPolicyRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: PolicyStatus.ARCHIVED }),
      );
    });
  });
});
