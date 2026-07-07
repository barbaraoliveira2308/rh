import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Employee, EmployeeStatus } from './employee.entity';

@Injectable()
export class EmployeeRepository extends Repository<Employee> {
  constructor(dataSource: DataSource) {
    super(Employee, dataSource.manager);
  }

  async findWithHierarchy(managerId: string): Promise<Employee[]> {
    const all = await this.find({
      where: { status: EmployeeStatus.ACTIVE },
      relations: ['department', 'jobTitle'],
    });

    const employeeMap = new Map<string, Employee & { children: Employee[] }>();
    for (const emp of all) {
      const item = Object.assign({}, emp, { children: [] as Employee[] });
      employeeMap.set(emp.id, item);
    }

    const roots: (Employee & { children: Employee[] })[] = [];
    for (const emp of employeeMap.values()) {
      if (emp.managerId && employeeMap.has(emp.managerId)) {
        const parent = employeeMap.get(emp.managerId);
        if (parent) {
          parent.children.push(emp);
        }
      } else {
        roots.push(emp);
      }
    }

    const findSubtree = (id: string): (Employee & { children: Employee[] })[] => {
      const result: (Employee & { children: Employee[] })[] = [];
      const node = employeeMap.get(id);
      if (node) {
        result.push(node);
        for (const child of node.children) {
          result.push(...findSubtree(child.id));
        }
      }
      return result;
    };

    return findSubtree(managerId);
  }
}
