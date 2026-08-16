import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { SystemSetting } from './entities/system-setting.entity';
import { LegalEntity } from './entities/legal-entity.entity';
import { User } from '../auth/entities/user.entity';
import { Contract } from '../contracts/entities/contract.entity';
import { RbacService } from '../rbac/services/rbac.service';
import { RoleEnum } from '../rbac/enums/role.enum';

describe('AdminService', () => {
  let service: AdminService;
  let mockSettingsRepo: Record<string, jest.Mock>;
  let mockLegalEntityRepo: Record<string, jest.Mock>;
  let mockUserRepo: Record<string, jest.Mock>;
  let mockContractRepo: Record<string, jest.Mock>;
  let mockRbacService: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockSettingsRepo = {
      find: jest.fn(),
      save: jest.fn((data: Partial<SystemSetting>) => Promise.resolve(data)),
    };
    mockLegalEntityRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((data: Partial<LegalEntity>) => data),
      save: jest.fn((data: Partial<LegalEntity>) => Promise.resolve(data)),
    };
    mockUserRepo = {
      findOneBy: jest.fn(),
      create: jest.fn((data: Partial<User>) => data),
      save: jest.fn((data: Partial<User>) => Promise.resolve({ id: 'u-new', ...data })),
    };
    mockContractRepo = {
      findOne: jest.fn(),
    };
    mockRbacService = {
      assignRoleByName: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(SystemSetting), useValue: mockSettingsRepo },
        { provide: getRepositoryToken(LegalEntity), useValue: mockLegalEntityRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(Contract), useValue: mockContractRepo },
        { provide: RbacService, useValue: mockRbacService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  describe('getSettings', () => {
    it('deve devolver a linha única de configurações', async () => {
      mockSettingsRepo.find.mockResolvedValue([{ id: 's-1', companyName: 'Bridge351' }]);

      const result = await service.getSettings();

      expect(result.id).toBe('s-1');
    });

    it('deve lançar NotFoundException se não existir linha de configurações', async () => {
      mockSettingsRepo.find.mockResolvedValue([]);

      await expect(service.getSettings()).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateSettings', () => {
    it('deve atualizar apenas os campos fornecidos', async () => {
      mockSettingsRepo.find.mockResolvedValue([
        { id: 's-1', companyName: 'Bridge351', defaultVacationDaysPerYear: 22 },
      ]);

      const result = await service.updateSettings({ defaultVacationDaysPerYear: 25 });

      expect(result.defaultVacationDaysPerYear).toBe(25);
      expect(result.companyName).toBe('Bridge351');
    });
  });

  describe('createLegalEntity', () => {
    it('deve criar entidade legal com valores por defeito', async () => {
      const result = await service.createLegalEntity({
        name: 'NIVVOS',
        country: 'PT',
        currency: 'EUR',
        calendarProfileCountryCode: 'PT',
      });

      expect(result.name).toBe('NIVVOS');
      expect(result.isActive).toBe(true);
      expect(result.nif).toBeNull();
    });
  });

  describe('updateLegalEntity', () => {
    it('deve lançar NotFoundException se a entidade não existir', async () => {
      mockLegalEntityRepo.findOne.mockResolvedValue(null);

      await expect(service.updateLegalEntity('missing-id', { isActive: false })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve atualizar campos da entidade existente', async () => {
      mockLegalEntityRepo.findOne.mockResolvedValue({
        id: 'le-1',
        name: 'NIVVOS',
        isActive: true,
      });

      const result = await service.updateLegalEntity('le-1', { isActive: false });

      expect(result.isActive).toBe(false);
    });
  });

  describe('getEffectiveLegalEntity', () => {
    it('deve devolver a LegalEntity do contrato ativo do colaborador', async () => {
      mockContractRepo.findOne.mockResolvedValue({
        id: 'c-1',
        legalEntity: { id: 'le-1', currency: 'USD' },
      });

      const result = await service.getEffectiveLegalEntity('emp-1');

      expect(result?.currency).toBe('USD');
    });

    it('deve devolver null se o colaborador não tiver contrato ativo', async () => {
      mockContractRepo.findOne.mockResolvedValue(null);

      const result = await service.getEffectiveLegalEntity('emp-1');

      expect(result).toBeNull();
    });

    it('deve devolver null se o contrato ativo não estiver ligado a nenhuma LegalEntity', async () => {
      mockContractRepo.findOne.mockResolvedValue({ id: 'c-1', legalEntity: null });

      const result = await service.getEffectiveLegalEntity('emp-1');

      expect(result).toBeNull();
    });
  });

  describe('createUser', () => {
    it('deve criar utilizador com username derivado do email e atribuir o perfil EMPLOYEE', async () => {
      mockUserRepo.findOneBy.mockResolvedValue(null);

      const result = await service.createUser(
        { email: 'nova.conta@bridge351.com' },
        'admin-user-id',
      );

      expect(result.id).toBe('u-new');
      expect(mockUserRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'nova.conta@bridge351.com',
          username: 'nova.conta',
          passwordHash: '',
          isActive: true,
        }),
      );
      expect(mockRbacService.assignRoleByName).toHaveBeenCalledWith(
        'u-new',
        RoleEnum.EMPLOYEE,
        'admin-user-id',
      );
    });

    it('deve usar o username explícito quando fornecido', async () => {
      mockUserRepo.findOneBy.mockResolvedValue(null);

      await service.createUser({ email: 'a@b.com', username: 'custom' }, 'admin-user-id');

      expect(mockUserRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'custom' }),
      );
    });

    it('deve lançar ConflictException se o email já existir', async () => {
      mockUserRepo.findOneBy.mockResolvedValueOnce({ id: 'existing', email: 'a@b.com' });

      await expect(service.createUser({ email: 'a@b.com' }, 'admin-user-id')).rejects.toThrow(
        ConflictException,
      );
      expect(mockRbacService.assignRoleByName).not.toHaveBeenCalled();
    });

    it('deve lançar ConflictException se o username derivado já existir', async () => {
      mockUserRepo.findOneBy
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'existing', username: 'a' });

      await expect(service.createUser({ email: 'a@b.com' }, 'admin-user-id')).rejects.toThrow(
        ConflictException,
      );
      expect(mockRbacService.assignRoleByName).not.toHaveBeenCalled();
    });
  });

  describe('health', () => {
    it('deve devolver status ok', () => {
      const result = service.health();

      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('metrics', () => {
    it('deve devolver métricas em formato de texto Prometheus', async () => {
      const result = await service.metrics();

      expect(typeof result).toBe('string');
    });
  });
});
