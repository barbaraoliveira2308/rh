import { fetchEmployees } from '@/api/users.api';
import type { Employee } from '@/types/users';

export interface DepartmentDistribution {
  department: string;
  count: number;
  percentage: number;
}

export async function fetchActiveEmployeeDirectory(): Promise<Employee[]> {
  const limit = 100;
  const firstPage = await fetchEmployees({ status: 'active', page: 1, limit });
  const employees = [...firstPage.data];
  const pageCount = Math.ceil(firstPage.total / limit);

  for (let page = 2; page <= pageCount; page += 1) {
    const nextPage = await fetchEmployees({ status: 'active', page, limit });
    employees.push(...nextPage.data);
  }

  return employees;
}

export function buildDepartmentDistribution(employees: Employee[]): DepartmentDistribution[] {
  const counts = new Map<string, number>();
  for (const employee of employees) {
    const department = employee.department?.name ?? 'Outros';
    counts.set(department, (counts.get(department) ?? 0) + 1);
  }

  const total = employees.length;
  return [...counts.entries()]
    .map(([department, count]) => ({
      department,
      count,
      percentage: total === 0 ? 0 : (count / total) * 100,
    }))
    .sort((left, right) => right.count - left.count);
}
