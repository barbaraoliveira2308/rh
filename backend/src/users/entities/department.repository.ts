import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Department } from './department.entity';

export interface DepartmentTreeNode extends Department {
  children: DepartmentTreeNode[];
}

@Injectable()
export class DepartmentRepository extends Repository<Department> {
  constructor(dataSource: DataSource) {
    super(Department, dataSource.manager);
  }

  async findTree(): Promise<DepartmentTreeNode[]> {
    const all = await this.find({ relations: ['children'] });

    const deptMap = new Map<string, DepartmentTreeNode>();
    for (const dept of all) {
      const node = Object.assign({}, dept, { children: [] as DepartmentTreeNode[] });
      deptMap.set(dept.id, node);
    }

    const roots: DepartmentTreeNode[] = [];
    for (const dept of deptMap.values()) {
      if (dept.parentId) {
        const parent = deptMap.get(dept.parentId);
        if (parent) {
          parent.children.push(dept);
          continue;
        }
      }
      roots.push(dept);
    }

    return roots;
  }
}
