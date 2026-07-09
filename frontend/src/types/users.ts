export enum EmployeeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ON_LEAVE = 'on_leave',
}

export interface Employee {
  id: string;
  userId: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  personalEmail: string | null;
  phone: string | null;
  nif: string | null;
  birthDate: string | null;
  address: string | null;
  nationality: string | null;
  gender: string | null;
  photoUrl: string | null;
  departmentId: string | null;
  jobTitleId: string | null;
  managerId: string | null;
  employmentStartDate: string;
  employmentEndDate: string | null;
  status: EmployeeStatus;
  workLocation: string | null;
  iban: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    email: string;
    username: string;
    isActive: boolean;
  } | null;
  department?: Department | null;
  jobTitle?: JobTitle | null;
  manager?: Employee | null;
}

export interface Department {
  id: string;
  name: string;
  code: string | null;
  parentId: string | null;
  managerId: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface JobTitle {
  id: string;
  name: string;
  level: string | null;
  departmentId: string | null;
  hourlyRate: number | null;
  isActive: boolean;
}

export interface OrgChartNode {
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

export interface EmployeeFilters {
  status?: string;
  departmentId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface EmployeeListResponse {
  data: Employee[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateEmployeeRequest {
  userId?: string;
  employeeNumber?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  personalEmail?: string;
  phone?: string;
  nif?: string;
  birthDate?: string;
  address?: string;
  nationality?: string;
  gender?: string;
  photoUrl?: string;
  departmentId?: string;
  jobTitleId?: string;
  managerId?: string;
  employmentStartDate?: string;
  employmentEndDate?: string;
  status?: EmployeeStatus;
  workLocation?: string;
  iban?: string;
}

export type UpdateEmployeeRequest = Partial<CreateEmployeeRequest>;
