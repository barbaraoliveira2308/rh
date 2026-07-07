import { EmployeeStatus } from '../entities/employee.entity';

export class OrgChartNode {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeNumber: string;
  jobTitle: string | null;
  department: string | null;
  status: EmployeeStatus;
  photoUrl: string | null;
  children: OrgChartNode[];
}
