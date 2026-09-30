import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { Contract, ContractStatus } from '../entities/contract.entity';
import { ContractRenewal } from '../entities/contract-renewal.entity';
import { Employee } from '../../users/entities/employee.entity';
import { AdminService } from '../../admin/admin.service';

describe('ContractsService', () => {
  let service: ContractsService;
  let mockContractRepo: Record<string, jest.Mock>;
  let mockRenewalRepo: Record<string, jest.Mock>;
  let mockEmployeeRepo: Record<string, jest.Mock>;
  let mockEventEmitter: Record<string, jest.Mock>;
  let mockAdminService: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockContractRepo = {
      create: jest.fn((data: Partial<Contract>) => data),
      save: jest.fn((data: Partial<Contract>) => Promise.resolve(data)),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      update: jest.fn(),
    };
    mockRenewalRepo = {
      create: jest.fn((data: Partial<ContractRenewal>) => data),
      save: jest.fn((data: Partial<ContractRenewal>) => Promise.resolve(data)),
    };
    mockEmployeeRepo = {
      findOne: jest.fn(),
    };
    mockEventEmitter = {
      emit: jest.fn(),
    };
    mockAdminService = {
      getSettings: jest.fn().mockResolvedValue({ contractExpiryAlertDays: 30 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractsService,
        { provide: getRepositoryToken(Contract), useValue: mockContractRepo },
        { provide: getRepositoryToken(ContractRenewal), useValue: mockRenewalRepo },
        { provide: getRepositoryToken(Employee), useValue: mockEmployeeRepo },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: AdminService, useValue: mockAdminService },
      ],
    }).compile();

    service = module.get<ContractsService>(ContractsService);
  });

  describe('create', () => {
    it('deve lançar NotFoundException se o colaborador não existir', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue(null);

      await expect(service.create({ employeeId: 'e-1' } as never)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar ConflictException se o colaborador já tiver um contrato ativo', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue({ id: 'e-1' });
      mockContractRepo.findOne.mockResolvedValue({ id: 'c-1', status: ContractStatus.ACTIVE });

      await expect(service.create({ employeeId: 'e-1' } as never)).rejects.toThrow(
        ConflictException,
      );
    });

    it('deve criar o contrato quando o colaborador não tem contrato ativo', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue({ id: 'e-1' });
      mockContractRepo.findOne.mockResolvedValue(null);

      const result = await service.create({ employeeId: 'e-1' } as never);

      expect(result).toEqual(expect.objectContaining({ employeeId: 'e-1' }));
    });
  });

  describe('findOne', () => {
    it('deve lançar NotFoundException se o contrato não existir', async () => {
      mockContractRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findForUser', () => {
    it('deve listar contratos apenas do colaborador associado ao utilizador', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue({ id: 'employee-1' });
      mockContractRepo.find.mockResolvedValue([]);

      await service.findForUser('user-1');

      expect(mockEmployeeRepo.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        select: ['id'],
      });
      expect(mockContractRepo.find).toHaveBeenCalledWith({
        where: { employeeId: 'employee-1' },
        relations: ['legalEntity'],
        order: { createdAt: 'DESC' },
      });
    });

    it('deve falhar quando o utilizador não tem colaborador associado', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue(null);

      await expect(service.findForUser('user-without-employee')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateForUser', () => {
    it('deve impedir a edição de contrato pertencente a outro colaborador', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue({ id: 'employee-1' });
      mockContractRepo.findOne.mockResolvedValue({ id: 'contract-2', employeeId: 'employee-2' });

      await expect(
        service.updateForUser('user-1', 'contract-2', { contractingEntity: 'Outra empresa' }),
      ).rejects.toThrow(ForbiddenException);
      expect(mockContractRepo.update).not.toHaveBeenCalled();
    });

    it('deve atualizar apenas o contrato associado ao próprio colaborador', async () => {
      const contract = { id: 'contract-1', employeeId: 'employee-1' } as Contract;
      mockEmployeeRepo.findOne.mockResolvedValue({ id: 'employee-1' });
      mockContractRepo.findOne.mockResolvedValueOnce(contract).mockResolvedValueOnce(contract);
      mockContractRepo.update.mockResolvedValue({ affected: 1 });

      await service.updateForUser('user-1', 'contract-1', { monthlyCost: 2500 });

      expect(mockContractRepo.update).toHaveBeenCalledWith('contract-1', { monthlyCost: 2500 });
    });
  });

  describe('renew', () => {
    it('deve lançar BadRequestException se o contrato não estiver ativo', async () => {
      mockContractRepo.findOne.mockResolvedValue({ id: 'c-1', status: ContractStatus.DRAFT });

      await expect(service.renew('c-1', { newEndDate: '2027-01-01' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve criar a renovação e atualizar a data de fim do contrato', async () => {
      const contract = {
        id: 'c-1',
        status: ContractStatus.ACTIVE,
        endDate: '2026-12-31',
      } as Contract;
      mockContractRepo.findOne.mockResolvedValue(contract);

      const result = await service.renew('c-1', { newEndDate: '2027-06-30' });

      expect(mockRenewalRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          contractId: 'c-1',
          previousEndDate: '2026-12-31',
          newEndDate: '2027-06-30',
        }),
      );
      expect(result.endDate).toBe('2027-06-30');
    });
  });

  describe('terminate', () => {
    it('deve lançar BadRequestException se o contrato não estiver ativo', async () => {
      mockContractRepo.findOne.mockResolvedValue({ id: 'c-1', status: ContractStatus.DRAFT });

      await expect(service.terminate('c-1', { reason: 'Fim de projeto' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve rescindir o contrato, registando data e motivo', async () => {
      const contract = { id: 'c-1', status: ContractStatus.ACTIVE } as Contract;
      mockContractRepo.findOne.mockResolvedValue(contract);

      const result = await service.terminate('c-1', { reason: 'Fim de projeto' });

      expect(result.status).toBe(ContractStatus.TERMINATED);
      expect(result.terminationReason).toBe('Fim de projeto');
      expect(result.terminatedAt).toBeInstanceOf(Date);
    });
  });

  describe('findExpiringSoon', () => {
    it('deve procurar contratos ativos com data de fim antes do limite calculado', async () => {
      await service.findExpiringSoon(15);

      expect(mockContractRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: ContractStatus.ACTIVE }) as Record<
            string,
            unknown
          >,
        }),
      );
    });
  });

  describe('scheduleExpirationAlerts', () => {
    it('deve emitir contract.expiring-soon para contratos a expirar e arquivar os expirados', async () => {
      const soon = new Date();
      soon.setDate(soon.getDate() + 10);
      const soonDateStr = soon.toISOString().split('T')[0];

      const expired = { id: 'c-2', status: ContractStatus.ACTIVE, endDate: '2020-01-01' };

      mockContractRepo.find
        .mockResolvedValueOnce([
          { id: 'c-1', employeeId: 'e-1', status: ContractStatus.ACTIVE, endDate: soonDateStr },
        ])
        .mockResolvedValueOnce([expired]);

      await service.scheduleExpirationAlerts();

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'contract.expiring-soon',
        expect.objectContaining({ contractId: 'c-1', employeeId: 'e-1' }),
      );
      expect(mockContractRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'c-2', status: ContractStatus.EXPIRED }),
      );
    });

    it('não deve emitir eventos se não houver contratos a expirar nem expirados', async () => {
      mockContractRepo.find.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      await service.scheduleExpirationAlerts();

      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
      expect(mockContractRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('getDocumentPresignedUrl', () => {
    it('deve lançar NotFoundException se o contrato não tiver documento associado', async () => {
      mockContractRepo.findOne.mockResolvedValue({ id: 'c-1', documentUrl: null });

      await expect(service.getDocumentPresignedUrl('c-1')).rejects.toThrow(NotFoundException);
    });

    it('deve devolver o URL do documento quando existir', async () => {
      mockContractRepo.findOne.mockResolvedValue({ id: 'c-1', documentUrl: 'https://x/doc.pdf' });

      const result = await service.getDocumentPresignedUrl('c-1');

      expect(result).toBe('https://x/doc.pdf');
    });
  });
});
