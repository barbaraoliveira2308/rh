import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { SystemSetting } from './entities/system-setting.entity';
import { LegalEntity } from './entities/legal-entity.entity';

describe('AdminService', () => {
  let service: AdminService;
  let mockSettingsRepo: Record<string, jest.Mock>;
  let mockLegalEntityRepo: Record<string, jest.Mock>;

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(SystemSetting), useValue: mockSettingsRepo },
        { provide: getRepositoryToken(LegalEntity), useValue: mockLegalEntityRepo },
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
