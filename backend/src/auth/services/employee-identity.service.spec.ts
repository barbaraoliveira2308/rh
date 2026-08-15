import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { EmployeeIdentityService } from './employee-identity.service';
import { Employee } from '../../users/entities/employee.entity';

describe('EmployeeIdentityService', () => {
  let service: EmployeeIdentityService;
  let employeeRepository: { findOne: jest.Mock };

  beforeEach(async () => {
    employeeRepository = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeIdentityService,
        { provide: getRepositoryToken(Employee), useValue: employeeRepository },
      ],
    }).compile();

    service = module.get<EmployeeIdentityService>(EmployeeIdentityService);
  });

  it('should resolve the Employee.id for a known userId', async () => {
    employeeRepository.findOne.mockResolvedValue({ id: 'emp-1', userId: 'user-1' });

    const result = await service.resolveEmployeeId('user-1');

    expect(employeeRepository.findOne).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(result).toBe('emp-1');
  });

  it('should throw ForbiddenException when no Employee exists for the userId', async () => {
    employeeRepository.findOne.mockResolvedValue(null);

    await expect(service.resolveEmployeeId('user-x')).rejects.toThrow(ForbiddenException);
  });
});
