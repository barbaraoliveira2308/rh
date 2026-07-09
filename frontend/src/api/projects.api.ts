import apiClient from './client';
import type {
  Project,
  ProjectFilters,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectAllocation,
  AllocateEmployeeRequest,
  UpdateAllocationRequest,
  AllocationResult,
} from '@/types/projects';

export async function fetchProjects(filters?: ProjectFilters): Promise<Project[]> {
  const response = await apiClient.get<Project[]>('/projects', { params: filters });
  return response.data;
}

export async function fetchProject(id: string): Promise<Project> {
  const response = await apiClient.get<Project>(`/projects/${id}`);
  return response.data;
}

export async function createProject(data: CreateProjectRequest): Promise<Project> {
  const response = await apiClient.post<Project>('/projects', data);
  return response.data;
}

export async function updateProject(id: string, data: UpdateProjectRequest): Promise<Project> {
  const response = await apiClient.patch<Project>(`/projects/${id}`, data);
  return response.data;
}

export async function activateProject(id: string): Promise<Project> {
  const response = await apiClient.post<Project>(`/projects/${id}/activate`);
  return response.data;
}

export async function closeProject(id: string): Promise<Project> {
  const response = await apiClient.post<Project>(`/projects/${id}/close`);
  return response.data;
}

export async function fetchAllocations(projectId: string): Promise<ProjectAllocation[]> {
  const response = await apiClient.get<ProjectAllocation[]>(`/projects/${projectId}/allocations`);
  return response.data;
}

export async function allocateEmployee(
  projectId: string,
  data: AllocateEmployeeRequest,
): Promise<AllocationResult> {
  const response = await apiClient.post<AllocationResult>(
    `/projects/${projectId}/allocations`,
    data,
  );
  return response.data;
}

export async function updateAllocation(
  projectId: string,
  allocationId: string,
  data: UpdateAllocationRequest,
): Promise<ProjectAllocation> {
  const response = await apiClient.patch<ProjectAllocation>(
    `/projects/${projectId}/allocations/${allocationId}`,
    data,
  );
  return response.data;
}

export async function deleteAllocation(projectId: string, allocationId: string): Promise<void> {
  await apiClient.delete(`/projects/${projectId}/allocations/${allocationId}`);
}
