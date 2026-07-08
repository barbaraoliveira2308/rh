import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AnalyticsService } from './analytics.service';
import { Employee } from '../../users/entities/employee.entity';
import { Contract } from '../../contracts/entities/contract.entity';
import { Project } from '../../projects/entities/project.entity';
import { RedisCacheService } from '../../cache/redis-cache.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let mockDataSource: Record<string, jest.Mock>;
  let mockEmployeeRepo: Record<string, jest.Mock>;
  let mockContractRepo: Record<string, jest.Mock>;
  let mockProjectRepo: Record<string, jest.Mock>;
  let mockRedisCache: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockDataSource = {
      getRepository: jest.fn(),
    };

    mockEmployeeRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
    };

    mockContractRepo = {
      findOne: jest.fn(),
    };

    mockProjectRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    mockRedisCache = {
      get: jest.fn(),
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: getRepositoryToken(Employee), useValue: mockEmployeeRepo },
        { provide: getRepositoryToken(Contract), useValue: mockContractRepo },
        { provide: getRepositoryToken(Project), useValue: mockProjectRepo },
        { provide: RedisCacheService, useValue: mockRedisCache },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  describe('getUnallocatedEmployees', () => {
    it('deve retornar colaboradores sem alocação', async () => {
      mockRedisCache.get.mockResolvedValue(null);

      const mockEmployees = [
        {
          id: 'emp-1',
          firstName: 'João',
          lastName: 'Silva',
          status: 'active',
        },
        {
          id: 'emp-2',
          firstName: 'Maria',
          lastName: 'Santos',
          status: 'active',
        },
      ];

      mockEmployeeRepo.find.mockResolvedValue(mockEmployees);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([{ employeeId: 'emp-1' }]),
      };

      mockDataSource.getRepository.mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      });

      const result = await service.getUnallocatedEmployees('2026-07');

      expect(result).toHaveLength(1);
      expect(result[0].employeeId).toBe('emp-2');
    });
  });

  describe('getConsultantMargin', () => {
    it('deve retornar margin null quando contrato não tem monthly_cost', async () => {
      mockRedisCache.get.mockResolvedValue(null);

      mockEmployeeRepo.findOne.mockResolvedValue({
        id: 'emp-1',
        firstName: 'João',
        lastName: 'Silva',
      });

      mockContractRepo.findOne.mockResolvedValue({
        id: 'contract-1',
        employeeId: 'emp-1',
        status: 'active',
        monthlyCost: null,
      });

      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          {
            project_id: 'proj-1',
            project_name: 'Projeto A',
            project_hourly_rate: 100,
            total_hours: 10,
          },
        ]),
      };

      mockDataSource.getRepository.mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      });

      const result = await service.getConsultantMargin('emp-1', '2026-07');

      expect(result).toHaveLength(1);
      expect(result[0].margin).toBeNull();
      expect(result[0].hourlyCost).toBeNull();
    });
  });
});
