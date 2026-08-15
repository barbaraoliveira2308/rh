import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CapacityService } from './capacity.service';
import { AnalyticsService } from '../analytics/services/analytics.service';
import { TeamsService } from '../teams/services/teams.service';
import { Employee, EmployeeStatus } from '../users/entities/employee.entity';
import { ProjectAllocation, AllocationType } from '../projects/entities/project-allocation.entity';
import { AbsenceRequest } from '../absences/entities/absence-request.entity';
import { AbsenceStatus } from '../absences/entities/absence-status.enum';
import { AdminService } from '../admin/admin.service';

describe('CapacityService', () => {
  let service: CapacityService;
  let mockEmployeeRepo: Record<string, jest.Mock>;
  let mockAllocationRepo: Record<string, jest.Mock>;
  let mockAbsenceRepo: Record<string, jest.Mock>;
  let mockAllocationQueryBuilder: Record<string, jest.Mock>;
  let mockAbsenceQueryBuilder: Record<string, jest.Mock>;
  let mockAnalyticsService: Record<string, jest.Mock>;
  let mockTeamsService: Record<string, jest.Mock>;
  let mockAdminService: Record<string, jest.Mock>;

  const buildQueryBuilder = (result: unknown[]): Record<string, jest.Mock> => {
    const qb: Record<string, jest.Mock> = {};
    qb.where = jest.fn().mockReturnValue(qb);
    qb.andWhere = jest.fn().mockReturnValue(qb);
    qb.innerJoinAndSelect = jest.fn().mockReturnValue(qb);
    qb.orderBy = jest.fn().mockReturnValue(qb);
    qb.getMany = jest.fn().mockResolvedValue(result);
    return qb;
  };

  beforeEach(async () => {
    mockAllocationQueryBuilder = buildQueryBuilder([]);
    mockAbsenceQueryBuilder = buildQueryBuilder([]);

    mockEmployeeRepo = {
      find: jest.fn(),
    };
    mockAllocationRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockAllocationQueryBuilder),
    };
    mockAbsenceRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockAbsenceQueryBuilder),
    };
    mockAnalyticsService = {
      getEmployeeOccupancy: jest.fn(),
      getTeamOccupancy: jest.fn(),
      getProjectProfitability: jest.fn(),
    };
    mockTeamsService = {
      getMembers: jest.fn(),
    };
    mockAdminService = {
      getSettings: jest.fn().mockResolvedValue({ underallocationThresholdPercentage: 80 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CapacityService,
        { provide: getRepositoryToken(Employee), useValue: mockEmployeeRepo },
        { provide: getRepositoryToken(ProjectAllocation), useValue: mockAllocationRepo },
        { provide: getRepositoryToken(AbsenceRequest), useValue: mockAbsenceRepo },
        { provide: AnalyticsService, useValue: mockAnalyticsService },
        { provide: TeamsService, useValue: mockTeamsService },
        { provide: AdminService, useValue: mockAdminService },
      ],
    }).compile();

    service = module.get<CapacityService>(CapacityService);
  });

  describe('getOverview', () => {
    it('deve devolver ocupação de um único colaborador quando employeeId é passado', async () => {
      mockAnalyticsService.getEmployeeOccupancy.mockResolvedValue({
        employeeId: 'emp-1',
        employeeName: 'Ana Silva',
        allocationPercentage: 60,
      });

      const result = await service.getOverview('2026-08', undefined, 'emp-1');

      expect(mockAnalyticsService.getEmployeeOccupancy).toHaveBeenCalledWith('emp-1', '2026-08');
      expect(result).toHaveLength(1);
      expect(result[0].allocationPercentage).toBe(60);
      expect(result[0].adjustedAllocationPercentage).toBe(60);
      expect(result[0].absenceDays).toBe(0);
    });

    it('deve devolver lista vazia quando employeeId não corresponde a colaborador', async () => {
      mockAnalyticsService.getEmployeeOccupancy.mockResolvedValue(null);

      const result = await service.getOverview('2026-08', undefined, 'unknown');

      expect(result).toEqual([]);
    });

    it('deve delegar em getTeamOccupancy quando teamId é passado', async () => {
      mockAnalyticsService.getTeamOccupancy.mockResolvedValue([
        { employeeId: 'emp-1', employeeName: 'Ana Silva', allocationPercentage: 100 },
      ]);

      const result = await service.getOverview('2026-08', 'team-1', undefined);

      expect(mockAnalyticsService.getTeamOccupancy).toHaveBeenCalledWith('team-1', '2026-08');
      expect(result).toHaveLength(1);
    });

    it('deve iterar colaboradores ativos quando nem teamId nem employeeId são passados', async () => {
      mockEmployeeRepo.find.mockResolvedValue([{ id: 'emp-1' }, { id: 'emp-2' }]);
      mockAnalyticsService.getEmployeeOccupancy
        .mockResolvedValueOnce({
          employeeId: 'emp-1',
          employeeName: 'Ana',
          allocationPercentage: 50,
        })
        .mockResolvedValueOnce({
          employeeId: 'emp-2',
          employeeName: 'Bruno',
          allocationPercentage: 0,
        });

      const result = await service.getOverview('2026-08');

      expect(mockEmployeeRepo.find).toHaveBeenCalledWith({
        where: { status: EmployeeStatus.ACTIVE },
      });
      expect(result).toHaveLength(2);
    });

    it('deve descontar dias de ausência aprovada da percentagem ajustada (BR-CAP-004)', async () => {
      mockAnalyticsService.getEmployeeOccupancy.mockResolvedValue({
        employeeId: 'emp-1',
        employeeName: 'Ana Silva',
        allocationPercentage: 50,
      });
      mockAbsenceQueryBuilder.getMany.mockResolvedValue([
        {
          employeeId: 'emp-1',
          status: AbsenceStatus.APPROVED,
          startDate: '2026-08-01',
          endDate: '2026-08-07',
        },
      ]);

      const result = await service.getOverview('2026-08', undefined, 'emp-1');

      expect(result[0].absenceDays).toBeGreaterThan(0);
      expect(result[0].adjustedAllocationPercentage).toBeGreaterThan(50);
    });
  });

  describe('getAlerts', () => {
    it('deve particionar colaboradores em sobrealocados, sub-alocados e disponíveis', async () => {
      mockEmployeeRepo.find.mockResolvedValue([{ id: 'emp-1' }, { id: 'emp-2' }, { id: 'emp-3' }]);
      mockAnalyticsService.getEmployeeOccupancy
        .mockResolvedValueOnce({
          employeeId: 'emp-1',
          employeeName: 'Over',
          allocationPercentage: 120,
        })
        .mockResolvedValueOnce({
          employeeId: 'emp-2',
          employeeName: 'Under',
          allocationPercentage: 40,
        })
        .mockResolvedValueOnce({
          employeeId: 'emp-3',
          employeeName: 'Free',
          allocationPercentage: 0,
        });

      const result = await service.getAlerts('2026-08');

      expect(result.overallocations).toHaveLength(1);
      expect(result.overallocations[0].employeeId).toBe('emp-1');
      expect(result.underallocations).toHaveLength(1);
      expect(result.underallocations[0].employeeId).toBe('emp-2');
      expect(result.available).toHaveLength(1);
      expect(result.available[0]).toEqual({ employeeId: 'emp-3', employeeName: 'Free' });
    });
  });

  describe('getCalendar', () => {
    it('deve devolver intervalos de alocação prontos para Gantt', async () => {
      mockAllocationQueryBuilder.getMany.mockResolvedValue([
        {
          employeeId: 'emp-1',
          employee: { firstName: 'Ana', lastName: 'Silva' },
          projectId: 'proj-1',
          project: { name: 'Projeto X' },
          startDate: '2026-08-01',
          endDate: '2026-08-31',
          allocationType: AllocationType.PERCENTAGE,
          allocationValue: 50,
        },
      ]);

      const result = await service.getCalendar('2026-08');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        employeeId: 'emp-1',
        employeeName: 'Ana Silva',
        projectId: 'proj-1',
        projectName: 'Projeto X',
        startDate: '2026-08-01',
        endDate: '2026-08-31',
        allocationType: AllocationType.PERCENTAGE,
        allocationValue: 50,
      });
    });

    it('deve devolver lista vazia quando a equipa não tem membros', async () => {
      mockTeamsService.getMembers.mockResolvedValue([]);

      const result = await service.getCalendar('2026-08', 'team-empty');

      expect(result).toEqual([]);
      expect(mockAllocationQueryBuilder.getMany).not.toHaveBeenCalled();
    });
  });

  describe('getProjectProfitability', () => {
    it('deve delegar em AnalyticsService.getProjectProfitability', async () => {
      mockAnalyticsService.getProjectProfitability.mockResolvedValue({
        projectId: 'proj-1',
        projectName: 'Projeto X',
        revenue: 1000,
        cost: 600,
        margin: 400,
      });

      const result = await service.getProjectProfitability('proj-1');

      expect(mockAnalyticsService.getProjectProfitability).toHaveBeenCalledWith('proj-1');
      expect(result?.margin).toBe(400);
    });
  });
});
