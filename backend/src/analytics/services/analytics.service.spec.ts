import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AnalyticsService } from './analytics.service';
import { Employee } from '../../users/entities/employee.entity';
import { Contract } from '../../contracts/entities/contract.entity';
import { Project } from '../../projects/entities/project.entity';
import { RedisCacheService } from '../../cache/redis-cache.service';
import { TeamMember } from '../../teams/entities/team-member.entity';
import {
  ProjectAllocation,
  AllocationType,
} from '../../projects/entities/project-allocation.entity';
import { TimesheetEntry } from '../../timesheets/entities/timesheet-entry.entity';

function createMockQueryBuilder(
  overrides: Record<string, jest.Mock> = {},
): Record<string, jest.Mock> {
  const builder: Record<string, jest.Mock> = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getRawMany: jest.fn().mockResolvedValue([]),
    getRawOne: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  return builder;
}

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

  describe('getTeamOccupancy', () => {
    it('deve devolver lista vazia se a equipa não tiver membros', async () => {
      mockRedisCache.get.mockResolvedValue(null);

      mockDataSource.getRepository.mockImplementation((entity: unknown) => {
        if (entity === TeamMember) {
          return { createQueryBuilder: jest.fn().mockReturnValue(createMockQueryBuilder()) };
        }
        throw new Error('unexpected entity: ' + String(entity));
      });

      const result = await service.getTeamOccupancy('team-1', '2026-07');

      expect(result).toEqual([]);
    });

    it('deve calcular a alocação ponderada para membros com tipos PERCENTAGE e HOURS', async () => {
      mockRedisCache.get.mockResolvedValue(null);

      const members = [
        {
          employeeId: 'emp-1',
          employee: { firstName: 'João', lastName: 'Silva' },
        },
        {
          employeeId: 'emp-2',
          employee: { firstName: 'Maria', lastName: 'Santos' },
        },
      ];

      const allocations = [
        {
          employeeId: 'emp-1',
          startDate: '2026-07-01',
          endDate: '2026-07-31',
          allocationType: AllocationType.PERCENTAGE,
          allocationValue: 50,
        },
        {
          employeeId: 'emp-2',
          startDate: '2026-07-01',
          endDate: '2026-07-31',
          allocationType: AllocationType.HOURS,
          allocationValue: 84,
        },
      ];

      mockDataSource.getRepository.mockImplementation((entity: unknown) => {
        if (entity === TeamMember) {
          return {
            createQueryBuilder: jest
              .fn()
              .mockReturnValue(
                createMockQueryBuilder({ getMany: jest.fn().mockResolvedValue(members) }),
              ),
          };
        }
        if (entity === ProjectAllocation) {
          return {
            createQueryBuilder: jest
              .fn()
              .mockReturnValue(
                createMockQueryBuilder({ getMany: jest.fn().mockResolvedValue(allocations) }),
              ),
          };
        }
        throw new Error('unexpected entity: ' + String(entity));
      });

      const result = await service.getTeamOccupancy('team-1', '2026-07');

      expect(result).toHaveLength(2);
      expect(result.find((r) => r.employeeId === 'emp-1')?.allocationPercentage).toBe(50);
      expect(result.find((r) => r.employeeId === 'emp-2')?.allocationPercentage).toBe(50);
    });
  });

  describe('getEmployeeOccupancy', () => {
    it('deve devolver null se o colaborador não existir', async () => {
      mockRedisCache.get.mockResolvedValue(null);
      mockEmployeeRepo.findOne.mockResolvedValue(null);

      const result = await service.getEmployeeOccupancy('missing', '2026-07');

      expect(result).toBeNull();
    });

    it('deve calcular a percentagem de alocação do colaborador', async () => {
      mockRedisCache.get.mockResolvedValue(null);
      mockEmployeeRepo.findOne.mockResolvedValue({
        id: 'emp-1',
        firstName: 'João',
        lastName: 'Silva',
      });

      mockDataSource.getRepository.mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(
          createMockQueryBuilder({
            getMany: jest.fn().mockResolvedValue([
              {
                startDate: '2026-07-01',
                endDate: '2026-07-31',
                allocationType: AllocationType.PERCENTAGE,
                allocationValue: 75,
              },
            ]),
          }),
        ),
      });

      const result = await service.getEmployeeOccupancy('emp-1', '2026-07');

      expect(result).toEqual({
        employeeId: 'emp-1',
        employeeName: 'João Silva',
        allocationPercentage: 75,
      });
    });
  });

  describe('getProjectAllocationMap', () => {
    it('deve agregar alocações do mesmo projeto e manter projetos separados', async () => {
      mockRedisCache.get.mockResolvedValue(null);

      const allocations = [
        {
          employeeId: 'emp-1',
          projectId: 'proj-1',
          project: { name: 'Projeto A' },
          startDate: '2026-07-01',
          endDate: '2026-07-31',
          allocationType: AllocationType.PERCENTAGE,
          allocationValue: 30,
        },
        {
          employeeId: 'emp-2',
          projectId: 'proj-1',
          project: { name: 'Projeto A' },
          startDate: '2026-07-01',
          endDate: '2026-07-31',
          allocationType: AllocationType.PERCENTAGE,
          allocationValue: 20,
        },
        {
          employeeId: 'emp-3',
          projectId: 'proj-2',
          project: { name: 'Projeto B' },
          startDate: '2026-07-01',
          endDate: '2026-07-31',
          allocationType: AllocationType.PERCENTAGE,
          allocationValue: 100,
        },
      ];

      mockDataSource.getRepository.mockReturnValue({
        createQueryBuilder: jest
          .fn()
          .mockReturnValue(
            createMockQueryBuilder({ getMany: jest.fn().mockResolvedValue(allocations) }),
          ),
      });

      const result = await service.getProjectAllocationMap('2026-07');

      expect(result).toHaveLength(2);
      expect(result.find((r) => r.projectId === 'proj-1')?.totalAllocationPercentage).toBe(50);
      expect(result.find((r) => r.projectId === 'proj-2')?.totalAllocationPercentage).toBe(100);
    });
  });

  describe('getCapacityForecast', () => {
    it('deve calcular capacidade total, alocada e disponível por mês', async () => {
      mockRedisCache.get.mockResolvedValue(null);
      mockEmployeeRepo.count.mockResolvedValue(5);

      const allocationResults = [
        [
          {
            startDate: '2020-01-01',
            endDate: null,
            allocationType: AllocationType.PERCENTAGE,
            allocationValue: 100,
          },
        ],
        [],
      ];
      let callIndex = 0;

      mockDataSource.getRepository.mockImplementation((entity: unknown) => {
        if (entity === ProjectAllocation) {
          const results = allocationResults[callIndex] ?? [];
          callIndex += 1;
          return {
            createQueryBuilder: jest
              .fn()
              .mockReturnValue(
                createMockQueryBuilder({ getMany: jest.fn().mockResolvedValue(results) }),
              ),
          };
        }
        throw new Error('unexpected entity: ' + String(entity));
      });

      const result = await service.getCapacityForecast(2);

      expect(result).toHaveLength(2);
      expect(result[0].totalCapacity).toBe(5);
      expect(result[0].allocatedCapacity).toBe(1);
      expect(result[0].availableCapacity).toBe(4);
      expect(result[1].allocatedCapacity).toBe(0);
      expect(result[1].availableCapacity).toBe(5);
      expect(result[0].month).not.toBe(result[1].month);
    });
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

    it('deve devolver lista vazia se o colaborador não existir', async () => {
      mockRedisCache.get.mockResolvedValue(null);
      mockEmployeeRepo.findOne.mockResolvedValue(null);

      const result = await service.getConsultantMargin('missing', '2026-07');

      expect(result).toEqual([]);
      expect(mockContractRepo.findOne).not.toHaveBeenCalled();
    });

    it('deve calcular a margem quando o contrato tem monthly_cost', async () => {
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
        monthlyCost: 16800,
      });

      mockDataSource.getRepository.mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(
          createMockQueryBuilder({
            getRawMany: jest.fn().mockResolvedValue([
              {
                project_id: 'proj-1',
                project_name: 'Projeto A',
                project_hourly_rate: 150,
                total_hours: 10,
              },
            ]),
          }),
        ),
      });

      const result = await service.getConsultantMargin('emp-1', '2026-07');

      expect(result).toHaveLength(1);
      expect(result[0].hourlyCost).toBe(100);
      expect(result[0].margin).toBe(500);
    });
  });

  describe('getProjectProfitability', () => {
    it('deve devolver null se o projeto não existir', async () => {
      mockRedisCache.get.mockResolvedValue(null);
      mockProjectRepo.findOne.mockResolvedValue(null);

      const result = await service.getProjectProfitability('missing');

      expect(result).toBeNull();
    });

    it('deve devolver margem zero se não houver horas registadas', async () => {
      mockRedisCache.get.mockResolvedValue(null);
      mockProjectRepo.findOne.mockResolvedValue({ id: 'proj-1', name: 'Projeto A' });

      mockDataSource.getRepository.mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(
          createMockQueryBuilder({
            getRawOne: jest.fn().mockResolvedValue({
              project_hourly_rate: 100,
              total_hours: 0,
              revenue: 0,
              cost: 0,
            }),
          }),
        ),
      });

      const result = await service.getProjectProfitability('proj-1');

      expect(result).toEqual({
        projectId: 'proj-1',
        projectName: 'Projeto A',
        revenue: 0,
        cost: 0,
        margin: 0,
      });
    });

    it('deve calcular receita, custo e margem a partir das entradas de timesheet', async () => {
      mockRedisCache.get.mockResolvedValue(null);
      mockProjectRepo.findOne.mockResolvedValue({ id: 'proj-1', name: 'Projeto A' });

      mockDataSource.getRepository.mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(
          createMockQueryBuilder({
            getRawOne: jest.fn().mockResolvedValue({
              project_hourly_rate: 100,
              total_hours: 20,
              revenue: 2000,
              cost: 1000,
            }),
          }),
        ),
      });

      const result = await service.getProjectProfitability('proj-1');

      expect(result).toEqual({
        projectId: 'proj-1',
        projectName: 'Projeto A',
        revenue: 2000,
        cost: 1000,
        margin: 1000,
      });
    });
  });

  describe('getMonthlyRevenue', () => {
    it('deve mapear as linhas agregadas para o DTO de receita mensal', async () => {
      mockRedisCache.get.mockResolvedValue(null);

      mockDataSource.getRepository.mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(
          createMockQueryBuilder({
            getRawMany: jest.fn().mockResolvedValue([
              {
                month: '2026-07',
                project_id: 'proj-1',
                project_name: 'Projeto A',
                client_id: 'client-1',
                revenue: 5000,
              },
            ]),
          }),
        ),
      });

      const result = await service.getMonthlyRevenue(2026);

      expect(result).toEqual([
        {
          month: '2026-07',
          projectId: 'proj-1',
          projectName: 'Projeto A',
          clientId: 'client-1',
          revenue: 5000,
        },
      ]);
    });
  });

  describe('getTopPerformingProjects', () => {
    it('deve ordenar por margem descendente e respeitar o limite', async () => {
      mockRedisCache.get.mockResolvedValue(null);

      const projA = { id: 'proj-a', name: 'Projeto A', status: 'active' };
      const projB = { id: 'proj-b', name: 'Projeto B', status: 'active' };
      const projC = { id: 'proj-c', name: 'Projeto C', status: 'active' };

      mockProjectRepo.find.mockResolvedValue([projA, projB, projC]);
      mockProjectRepo.findOne.mockImplementation(({ where }: { where: { id: string } }) =>
        Promise.resolve([projA, projB, projC].find((p) => p.id === where.id) ?? null),
      );

      const rawResults = [
        { project_hourly_rate: 100, total_hours: 10, revenue: 1000, cost: 500 },
        { project_hourly_rate: 100, total_hours: 10, revenue: 1000, cost: 900 },
        { project_hourly_rate: 100, total_hours: 10, revenue: 1000, cost: 1200 },
      ];
      let callIndex = 0;

      mockDataSource.getRepository.mockImplementation((entity: unknown) => {
        if (entity === TimesheetEntry) {
          const result = rawResults[callIndex];
          callIndex += 1;
          return {
            createQueryBuilder: jest
              .fn()
              .mockReturnValue(
                createMockQueryBuilder({ getRawOne: jest.fn().mockResolvedValue(result) }),
              ),
          };
        }
        throw new Error('unexpected entity: ' + String(entity));
      });

      const result = await service.getTopPerformingProjects(2);

      expect(result).toHaveLength(2);
      expect(result[0].projectId).toBe('proj-a');
      expect(result[0].margin).toBe(500);
      expect(result[1].projectId).toBe('proj-b');
      expect(result[1].margin).toBe(100);
    });
  });
});
