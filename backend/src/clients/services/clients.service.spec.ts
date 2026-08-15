import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { Client, ClientStatus } from '../entities/client.entity';

describe('ClientsService', () => {
  let service: ClientsService;
  let mockClientRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockClientRepo = {
      create: jest.fn((data: Partial<Client>) => data),
      save: jest.fn((data: Partial<Client>) => Promise.resolve(data)),
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        { provide: getRepositoryToken(Client), useValue: mockClientRepo },
      ],
    }).compile();

    service = module.get<ClientsService>(ClientsService);
  });

  describe('create', () => {
    it('deve criar o cliente quando o NIF não está registado', async () => {
      mockClientRepo.findOne.mockResolvedValue(null);

      const result = await service.create({ name: 'Cliente Demo', nif: '123456789' });

      expect(mockClientRepo.findOne).toHaveBeenCalledWith({ where: { nif: '123456789' } });
      expect(result).toEqual(expect.objectContaining({ name: 'Cliente Demo', nif: '123456789' }));
    });

    it('deve lançar ConflictException se o NIF já estiver registado', async () => {
      mockClientRepo.findOne.mockResolvedValue({ id: 'c-1', nif: '123456789' });

      await expect(service.create({ name: 'Cliente Demo', nif: '123456789' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('não valida NIF quando não é fornecido', async () => {
      const result = await service.create({ name: 'Cliente Sem NIF' });

      expect(mockClientRepo.findOne).not.toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ name: 'Cliente Sem NIF' }));
    });
  });

  describe('findAll', () => {
    it('deve devolver apenas clientes não eliminados, ordenados por nome', async () => {
      mockClientRepo.find.mockResolvedValue([]);

      await service.findAll();

      expect(mockClientRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: ['responsible'],
          order: { name: 'ASC' },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('deve lançar NotFoundException se o cliente não existir', async () => {
      mockClientRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });

    it('deve devolver o cliente encontrado', async () => {
      const client = { id: 'c-1', name: 'Cliente Demo' } as Client;
      mockClientRepo.findOne.mockResolvedValue(client);

      const result = await service.findOne('c-1');

      expect(result).toBe(client);
    });
  });

  describe('update', () => {
    it('deve lançar ConflictException se o novo NIF já pertencer a outro cliente', async () => {
      mockClientRepo.findOne
        .mockResolvedValueOnce({ id: 'c-1', nif: '111111111' })
        .mockResolvedValueOnce({ id: 'c-2', nif: '222222222' });

      await expect(service.update('c-1', { nif: '222222222' })).rejects.toThrow(ConflictException);
    });

    it('deve atualizar o cliente quando o NIF não muda ou está livre', async () => {
      mockClientRepo.findOne
        .mockResolvedValueOnce({ id: 'c-1', nif: '111111111' })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'c-1', nif: '222222222' });

      const result = await service.update('c-1', { nif: '222222222' });

      expect(mockClientRepo.update).toHaveBeenCalledWith('c-1', { nif: '222222222' });
      expect(result).toEqual({ id: 'c-1', nif: '222222222' });
    });
  });

  describe('deactivate', () => {
    it('deve lançar ConflictException se o cliente já estiver inativo', async () => {
      mockClientRepo.findOne.mockResolvedValue({ id: 'c-1', status: ClientStatus.INACTIVE });

      await expect(service.deactivate('c-1')).rejects.toThrow(ConflictException);
    });

    it('deve desativar o cliente ativo', async () => {
      const client = { id: 'c-1', status: ClientStatus.ACTIVE } as Client;
      mockClientRepo.findOne.mockResolvedValue(client);

      const result = await service.deactivate('c-1');

      expect(result.status).toBe(ClientStatus.INACTIVE);
    });
  });

  describe('softDelete', () => {
    it('deve marcar deletedAt no cliente', async () => {
      const client = { id: 'c-1', deletedAt: null } as unknown as Client;
      mockClientRepo.findOne.mockResolvedValue(client);

      await service.softDelete('c-1');

      expect(mockClientRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: expect.any(Date) as Date }),
      );
    });
  });

  describe('getProjects', () => {
    it('deve validar a existência do cliente e devolver lista vazia', async () => {
      mockClientRepo.findOne.mockResolvedValue({ id: 'c-1' });

      const result = await service.getProjects('c-1');

      expect(result).toEqual({ data: [] });
    });

    it('deve lançar NotFoundException se o cliente não existir', async () => {
      mockClientRepo.findOne.mockResolvedValue(null);

      await expect(service.getProjects('missing')).rejects.toThrow(NotFoundException);
    });
  });
});
