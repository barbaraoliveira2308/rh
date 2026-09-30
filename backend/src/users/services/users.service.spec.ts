import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { Employee, EmployeeStatus } from '../entities/employee.entity';
import { Department } from '../entities/department.entity';
import { JobTitle } from '../entities/job-title.entity';
import { EmployeeProfileDetails } from '../entities/employee-profile-details.entity';
import { EmployeeRepository } from '../entities/employee.repository';
import { DepartmentRepository } from '../entities/department.repository';

describe('UsersService', () => {
  let service: UsersService;

  const mockEmployeeRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockDepartmentRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    findTree: jest.fn(),
    findOneBy: jest.fn(),
  };

  const mockJobTitleRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    findOneBy: jest.fn(),
  };

  const mockDepartmentBaseRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    findOneBy: jest.fn(),
  };

  const mockProfileDetailsRepository = {
    findOne: jest.fn(),
    create: jest.fn((data: Partial<EmployeeProfileDetails>) => data),
    save: jest.fn((data: Partial<EmployeeProfileDetails>) => Promise.resolve(data)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: EmployeeRepository,
          useValue: mockEmployeeRepository,
        },
        {
          provide: DepartmentRepository,
          useValue: mockDepartmentRepository,
        },
        {
          provide: getRepositoryToken(Department),
          useValue: mockDepartmentBaseRepository,
        },
        {
          provide: getRepositoryToken(JobTitle),
          useValue: mockJobTitleRepository,
        },
        {
          provide: getRepositoryToken(EmployeeProfileDetails),
          useValue: mockProfileDetailsRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  const makeEmployee = (overrides: Partial<Employee>): Employee => {
    const base: Employee = {
      id: '',
      userId: '',
      employeeNumber: '',
      firstName: '',
      lastName: '',
      email: '',
      personalEmail: null,
      phone: null,
      nif: null,
      birthDate: null,
      address: null,
      nationality: null,
      gender: null,
      photoUrl: null,
      departmentId: null,
      jobTitleId: null,
      managerId: null,
      employmentStartDate: '2020-01-01',
      employmentEndDate: null,
      status: EmployeeStatus.ACTIVE,
      anonymizedAt: null,
      workLocation: null,
      iban: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: null,
      department: null,
      jobTitle: null,
      manager: null,
      directReports: [],
    };
    return Object.assign(base, overrides);
  };

  describe('findByUserId', () => {
    it('deve devolver o perfil sem carregar a conta nem dados sensíveis do gestor', async () => {
      const employee = makeEmployee({
        id: 'employee-1',
        userId: 'user-1',
        manager: makeEmployee({
          id: 'manager-1',
          firstName: 'Gestor',
          lastName: 'Exemplo',
          nif: '123456789',
          iban: 'PT50000000000000000000000',
        }),
      });
      mockEmployeeRepository.findOne.mockResolvedValue(employee);
      mockProfileDetailsRepository.findOne.mockResolvedValue(null);

      const result = await service.findByUserId('user-1');

      expect(result.manager).toEqual({
        id: 'manager-1',
        firstName: 'Gestor',
        lastName: 'Exemplo',
      });
      expect(result.manager).not.toHaveProperty('nif');
      expect(result.manager).not.toHaveProperty('iban');
      expect(mockEmployeeRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        relations: ['department', 'jobTitle', 'manager'],
      });
    });

    it('deve persistir detalhes pessoais e ignorar campos laborais de utilizador comum', async () => {
      const employee = makeEmployee({ id: 'employee-1', userId: 'user-1' });
      mockEmployeeRepository.findOne
        .mockResolvedValueOnce({ id: employee.id })
        .mockResolvedValueOnce(employee)
        .mockResolvedValueOnce(employee)
        .mockResolvedValueOnce(employee);
      mockProfileDetailsRepository.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      mockProfileDetailsRepository.save.mockImplementation(
        (details: Partial<EmployeeProfileDetails>) => Promise.resolve(details),
      );

      await service.updateMyProfile(
        'user-1',
        { firstName: 'Novo nome', employeeNumber: 'ALTERADO', preferredName: 'Nome social' },
        false,
      );

      expect(mockEmployeeRepository.update).toHaveBeenCalledWith(
        'employee-1',
        expect.objectContaining({ firstName: 'Novo nome' }),
      );
      expect(mockEmployeeRepository.update).not.toHaveBeenCalledWith(
        'employee-1',
        expect.objectContaining({ employeeNumber: 'ALTERADO' }),
      );
      expect(mockProfileDetailsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ employeeId: 'employee-1', preferredName: 'Nome social' }),
      );
    });

    it('deve falhar quando a conta não tem colaborador associado', async () => {
      mockEmployeeRepository.findOne.mockResolvedValue(null);

      await expect(service.findByUserId('user-without-employee')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getOrganizationChart', () => {
    it('should return empty array when no employees exist', async () => {
      mockEmployeeRepository.find.mockResolvedValue([]);

      const result = await service.getOrganizationChart();

      expect(result).toEqual([]);
      expect(mockEmployeeRepository.find).toHaveBeenCalledWith({
        where: { status: EmployeeStatus.ACTIVE },
        relations: ['department', 'jobTitle', 'manager'],
      });
    });

    it('should build tree structure from employee data', async () => {
      const ceo = makeEmployee({
        id: 'ceo-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@company.com',
        employeeNumber: '001',
        jobTitle: {
          id: 'jt-1',
          name: 'CEO',
          level: null,
          departmentId: null,
          hourlyRate: null,
          isActive: true,
          department: null,
        },
        department: {
          id: 'dept-1',
          name: 'Executive',
          code: null,
          parentId: null,
          managerId: null,
          description: null,
          isActive: true,
          createdAt: new Date(),
          parent: null,
          children: [],
        },
      });

      const manager = makeEmployee({
        id: 'mgr-1',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@company.com',
        employeeNumber: '002',
        managerId: 'ceo-1',
        jobTitle: {
          id: 'jt-2',
          name: 'Manager',
          level: null,
          departmentId: null,
          hourlyRate: null,
          isActive: true,
          department: null,
        },
        department: {
          id: 'dept-2',
          name: 'Engineering',
          code: null,
          parentId: null,
          managerId: null,
          description: null,
          isActive: true,
          createdAt: new Date(),
          parent: null,
          children: [],
        },
      });

      const employee = makeEmployee({
        id: 'emp-1',
        firstName: 'Bob',
        lastName: 'Brown',
        email: 'bob@company.com',
        employeeNumber: '003',
        managerId: 'mgr-1',
        jobTitle: {
          id: 'jt-3',
          name: 'Developer',
          level: 'Mid',
          departmentId: null,
          hourlyRate: null,
          isActive: true,
          department: null,
        },
        department: {
          id: 'dept-2',
          name: 'Engineering',
          code: null,
          parentId: null,
          managerId: null,
          description: null,
          isActive: true,
          createdAt: new Date(),
          parent: null,
          children: [],
        },
      });

      mockEmployeeRepository.find.mockResolvedValue([ceo, manager, employee]);

      const result = await service.getOrganizationChart();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('ceo-1');
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].id).toBe('mgr-1');
      expect(result[0].children[0].children).toHaveLength(1);
      expect(result[0].children[0].children[0].id).toBe('emp-1');
    });

    it('should return multiple root nodes for different top-level managers', async () => {
      const alice = makeEmployee({
        id: 'alice',
        firstName: 'Alice',
        email: 'alice@co.com',
        employeeNumber: '001',
      });

      const bob = makeEmployee({
        id: 'bob',
        firstName: 'Bob',
        email: 'bob@co.com',
        employeeNumber: '002',
      });

      mockEmployeeRepository.find.mockResolvedValue([alice, bob]);

      const result = await service.getOrganizationChart();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('alice');
      expect(result[1].id).toBe('bob');
    });
  });

  describe('transferEmployee', () => {
    const existingEmployee = makeEmployee({
      id: 'emp-1',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@company.com',
      employeeNumber: '001',
      departmentId: 'dept-old',
    });

    it('should transfer employee to new department and manager', async () => {
      let findOneCallCount = 0;
      mockEmployeeRepository.findOne.mockImplementation((opts: { where: { id: string } }) => {
        findOneCallCount++;
        if (opts.where.id === 'emp-1' && findOneCallCount > 1) {
          return Promise.resolve(
            makeEmployee({
              id: 'emp-1',
              departmentId: 'dept-new',
              managerId: 'mgr-2',
            }),
          );
        }
        if (opts.where.id === 'emp-1') {
          return Promise.resolve(existingEmployee);
        }
        if (opts.where.id === 'mgr-2') {
          return Promise.resolve(makeEmployee({ id: 'mgr-2', managerId: null }));
        }
        return Promise.resolve(null);
      });

      mockEmployeeRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.transferEmployee('emp-1', 'dept-new', 'mgr-2');

      expect(mockEmployeeRepository.update).toHaveBeenCalledWith('emp-1', {
        departmentId: 'dept-new',
        managerId: 'mgr-2',
      });
      expect(result.departmentId).toBe('dept-new');
      expect(result.managerId).toBe('mgr-2');
    });

    it('should reject self-management', async () => {
      mockEmployeeRepository.findOne.mockResolvedValue(existingEmployee);

      await expect(service.transferEmployee('emp-1', null, 'emp-1')).rejects.toThrow(
        BadRequestException,
      );

      expect(mockEmployeeRepository.update).not.toHaveBeenCalled();
    });

    it('should transfer with null department and null manager', async () => {
      let findOneCallCount = 0;
      mockEmployeeRepository.findOne.mockImplementation(() => {
        findOneCallCount++;
        if (findOneCallCount > 1) {
          return Promise.resolve(
            makeEmployee(
              Object.assign({}, existingEmployee, {
                departmentId: null,
                managerId: null,
              }),
            ),
          );
        }
        return Promise.resolve(existingEmployee);
      });

      mockEmployeeRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.transferEmployee('emp-1', null, null);

      expect(mockEmployeeRepository.update).toHaveBeenCalledWith('emp-1', {
        departmentId: null,
        managerId: null,
      });
      expect(result.departmentId).toBeNull();
      expect(result.managerId).toBeNull();
    });

    it('should detect and reject circular hierarchy', async () => {
      mockEmployeeRepository.findOne.mockImplementation((opts: { where: { id: string } }) => {
        const id = opts.where.id;
        const hierarchy: Record<string, Employee> = {
          'emp-1': makeEmployee({ id: 'emp-1', managerId: 'emp-2' }),
          'emp-2': makeEmployee({ id: 'emp-2', managerId: 'emp-3' }),
          'emp-3': makeEmployee({ id: 'emp-3', managerId: 'emp-1' }),
        };
        return Promise.resolve(hierarchy[id] ?? null);
      });

      await expect(service.transferEmployee('emp-1', null, 'emp-3')).rejects.toThrow(
        BadRequestException,
      );

      expect(mockEmployeeRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('isManagerOfEmployee', () => {
    const hierarchy: Record<string, Employee> = {
      'emp-1': makeEmployee({ id: 'emp-1', managerId: 'mgr-direct' }),
      'mgr-direct': makeEmployee({ id: 'mgr-direct', managerId: 'mgr-indirect' }),
      'mgr-indirect': makeEmployee({ id: 'mgr-indirect', managerId: null }),
      'other-emp': makeEmployee({ id: 'other-emp', managerId: 'other-mgr' }),
      'other-mgr': makeEmployee({ id: 'other-mgr', managerId: null }),
    };

    beforeEach(() => {
      mockEmployeeRepository.findOne.mockImplementation((opts: { where: { id: string } }) =>
        Promise.resolve(hierarchy[opts.where.id] ?? null),
      );
    });

    it('should return true for the direct manager', async () => {
      await expect(service.isManagerOfEmployee('mgr-direct', 'emp-1')).resolves.toBe(true);
    });

    it('should return true for an indirect manager (manager of the manager)', async () => {
      await expect(service.isManagerOfEmployee('mgr-indirect', 'emp-1')).resolves.toBe(true);
    });

    it('should return false when the manager is unrelated to the employee', async () => {
      await expect(service.isManagerOfEmployee('other-mgr', 'emp-1')).resolves.toBe(false);
    });

    it('should return false when the employee has no manager chain', async () => {
      await expect(service.isManagerOfEmployee('mgr-direct', 'mgr-indirect')).resolves.toBe(false);
    });
  });
});
