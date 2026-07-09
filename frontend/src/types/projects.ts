export enum ProjectStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  CLOSED = 'closed',
}

export enum AllocationType {
  PERCENTAGE = 'percentage',
  HOURS = 'hours',
}

export interface Project {
  id: string;
  name: string;
  code: string | null;
  clientId: string;
  managerId: string;
  status: ProjectStatus;
  startDate: string;
  endDate: string | null;
  description: string | null;
  hourlyRate: number | null;
  budget: number | null;
  alertDaysBeforeEnd: number;
  createdAt: string;
  updatedAt: string;
  client?: {
    id: string;
    name: string;
  };
  manager?: EmployeeSummary;
  allocations?: ProjectAllocation[];
}

export interface EmployeeSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface ProjectAllocation {
  id: string;
  projectId: string;
  employeeId: string;
  allocationType: AllocationType;
  allocationValue: number;
  startDate: string;
  endDate: string | null;
  roleInProject: string | null;
  hourlyRateOverride: number | null;
  alertDaysBeforeEnd: number;
  notes: string | null;
  createdAt: string;
  employee?: EmployeeSummary;
}

export interface ProjectFilters {
  status?: ProjectStatus;
  clientId?: string;
  managerId?: string;
}

export interface CreateProjectRequest {
  name?: string;
  code?: string;
  clientId?: string;
  managerId?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  hourlyRate?: number;
  budget?: number;
  alertDaysBeforeEnd?: number;
  status?: ProjectStatus;
}

export type UpdateProjectRequest = Partial<CreateProjectRequest>;

export interface AllocateEmployeeRequest {
  employeeId: string;
  allocationType: AllocationType;
  allocationValue: number;
  startDate: string;
  endDate?: string;
  roleInProject?: string;
  hourlyRateOverride?: number;
  alertDaysBeforeEnd?: number;
  notes?: string;
}

export type UpdateAllocationRequest = Partial<AllocateEmployeeRequest>;

export interface AllocationResult {
  allocation: ProjectAllocation;
  warning?: string;
}
