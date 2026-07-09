import apiClient from './client';
import type {
  Employee,
  EmployeeFilters,
  EmployeeListResponse,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  Department,
  JobTitle,
  OrgChartNode,
} from '@/types/users';

export async function fetchEmployees(filters?: EmployeeFilters): Promise<EmployeeListResponse> {
  const response = await apiClient.get<EmployeeListResponse>('/users', { params: filters });
  return response.data;
}

export async function fetchEmployee(id: string): Promise<Employee> {
  const response = await apiClient.get<Employee>(`/users/${id}`);
  return response.data;
}

export async function createEmployee(data: CreateEmployeeRequest): Promise<Employee> {
  const response = await apiClient.post<Employee>('/users', data);
  return response.data;
}

export async function updateEmployee(id: string, data: UpdateEmployeeRequest): Promise<Employee> {
  const response = await apiClient.patch<Employee>(`/users/${id}`, data);
  return response.data;
}

export async function deactivateEmployee(id: string, endDate?: string): Promise<Employee> {
  const response = await apiClient.delete<Employee>(`/users/${id}`, { data: { endDate } });
  return response.data;
}

export async function fetchOrgChart(id = 'root'): Promise<OrgChartNode[]> {
  const response = await apiClient.get<OrgChartNode[]>(`/users/${id}/org-chart`);
  return response.data;
}

export async function fetchDepartments(): Promise<Department[]> {
  const response = await apiClient.get<Department[]>('/departments');
  return response.data;
}

export async function fetchJobTitles(): Promise<JobTitle[]> {
  const response = await apiClient.get<JobTitle[]>('/job-titles');
  return response.data;
}
