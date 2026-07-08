import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProjectsService } from './projects.service';
import { Project, ProjectStatus } from '../entities/project.entity';
import { ProjectAllocation, AllocationType } from '../entities/project-allocation.entity';
import { ProjectTeamAllocation } from '../entities/project-team-allocation.entity';
import { Employee } from '../../users/entities/employee.entity';
import { AllocateEmployeeDto } from '../dto/allocate-employee.dto';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let mockAllocationRepo: Record<string, jest.Mock>;
  let mockProjectRepo: Record<string, jest.Mock>;
  let mockEmployeeRepo: Record<string, jest.Mock>;
  let mockEventEmitter: Record<string, jest.Mock>;

  const mockProject = {
    id: 'proj-1',
    name: 'Project Alpha',
    status: ProjectStatus.ACTIVE,
    clientId: 'client-1',
    managerId: 'emp-manager-1',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    alertDaysBeforeEnd: 30,
  };

  const mockEmployee = {
    id: 'emp-1',
    userId: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
  };

  beforeEach(async () => {
    mockAllocationRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    };

    mockProjectRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    mockEmployeeRepo = {
      findOne: jest.fn(),
    };

    mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getRepositoryToken(Project),
          useValue: mockProjectRepo,
        },
        {
          provide: getRepositoryToken(ProjectAllocation),
          useValue: mockAllocationRepo,
        },
        {
          provide: getRepositoryToken(ProjectTeamAllocation),
          useValue: { find: jest.fn(), create: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(Employee),
          useValue: mockEmployeeRepo,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  describe('allocateEmployee', () => {
    const dto: AllocateEmployeeDto = {
      employeeId: 'emp-1',
      allocationType: AllocationType.PERCENTAGE,
      allocationValue: 50,
      startDate: '2026-03-01',
      endDate: '2026-06-30',
      roleInProject: 'Developer',
    };

    it('deve lançar erro se projeto estiver fechado', async () => {
      mockProjectRepo.findOne.mockResolvedValue({
        ...mockProject,
        status: ProjectStatus.CLOSED,
      });

      await expect(service.allocateEmployee('proj-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('deve lançar erro se colaborador não existir', async () => {
      mockProjectRepo.findOne.mockResolvedValue(mockProject);
      mockEmployeeRepo.findOne.mockResolvedValue(null);

      await expect(service.allocateEmployee('proj-1', dto)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar erro se colaborador já tiver alocação ativa no mesmo projeto', async () => {
      mockProjectRepo.findOne.mockResolvedValue(mockProject);
      mockEmployeeRepo.findOne.mockResolvedValue(mockEmployee);
      mockAllocationRepo.findOne.mockResolvedValue({ id: 'alloc-existing' });

      await expect(service.allocateEmployee('proj-1', dto)).rejects.toThrow(ConflictException);
    });

    it('deve criar alocação com sucesso se não houver sobreposição', async () => {
      mockProjectRepo.findOne.mockResolvedValue(mockProject);
      mockEmployeeRepo.findOne.mockResolvedValue(mockEmployee);
      mockAllocationRepo.findOne.mockResolvedValue(null);
      mockAllocationRepo.find.mockResolvedValue([]);
      mockAllocationRepo.create.mockReturnValue(Object.assign({ id: 'alloc-1' }, dto));
      mockAllocationRepo.save.mockResolvedValue(Object.assign({ id: 'alloc-1' }, dto));

      const result = await service.allocateEmployee('proj-1', dto);

      expect(result.allocation).toBeDefined();
      expect(result.allocation.id).toBe('alloc-1');
      expect(result.warning).toBeUndefined();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('allocation.created', expect.any(Object));
    });

    it('deve emitir warning de sobrealocação quando total ultrapassa 100%', async () => {
      mockProjectRepo.findOne.mockResolvedValue(mockProject);
      mockEmployeeRepo.findOne.mockResolvedValue(mockEmployee);
      mockAllocationRepo.findOne.mockResolvedValue(null);
      mockAllocationRepo.find.mockResolvedValue([{ allocationValue: 60, endDate: null }]);
      mockAllocationRepo.create.mockReturnValue(Object.assign({ id: 'alloc-2' }, dto));
      mockAllocationRepo.save.mockResolvedValue(Object.assign({ id: 'alloc-2' }, dto));

      const result = await service.allocateEmployee('proj-1', dto);

      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('110%');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'allocation.overallocation-detected',
        expect.any(Object),
      );
    });

    it('deve permitir alocação mesmo com warning de sobrealocação', async () => {
      mockProjectRepo.findOne.mockResolvedValue(mockProject);
      mockEmployeeRepo.findOne.mockResolvedValue(mockEmployee);
      mockAllocationRepo.findOne.mockResolvedValue(null);
      mockAllocationRepo.find.mockResolvedValue([{ allocationValue: 60, endDate: null }]);
      mockAllocationRepo.create.mockReturnValue(Object.assign({ id: 'alloc-3' }, dto));
      mockAllocationRepo.save.mockResolvedValue(Object.assign({ id: 'alloc-3' }, dto));

      const result = await service.allocateEmployee('proj-1', dto);

      expect(result.allocation).toBeDefined();
      expect(result.warning).toBeDefined();
    });

    it('deve permitir alocação em projeto em estado draft', async () => {
      mockProjectRepo.findOne.mockResolvedValue({
        ...mockProject,
        status: ProjectStatus.DRAFT,
      });
      mockEmployeeRepo.findOne.mockResolvedValue(mockEmployee);
      mockAllocationRepo.findOne.mockResolvedValue(null);
      mockAllocationRepo.find.mockResolvedValue([]);
      mockAllocationRepo.create.mockReturnValue(Object.assign({ id: 'alloc-draft' }, dto));
      mockAllocationRepo.save.mockResolvedValue(Object.assign({ id: 'alloc-draft' }, dto));

      const result = await service.allocateEmployee('proj-1', dto);

      expect(result.allocation).toBeDefined();
      expect(result.allocation.id).toBe('alloc-draft');
    });
  });
});
