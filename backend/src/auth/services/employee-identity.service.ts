import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from '../../users/entities/employee.entity';

@Injectable()
export class EmployeeIdentityService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  async resolveEmployeeId(userId: string): Promise<string> {
    const employee = await this.employeeRepository.findOne({ where: { userId } });

    if (!employee) {
      throw new ForbiddenException('Colaborador não encontrado para o utilizador autenticado');
    }

    return employee.id;
  }
}
