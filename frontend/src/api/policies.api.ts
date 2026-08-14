import apiClient from './client';
import type {
  Policy,
  PolicyFilters,
  CreatePolicyRequest,
  UpdatePolicyRequest,
} from '@/types/policies';

export async function fetchPolicies(filters?: PolicyFilters): Promise<Policy[]> {
  const response = await apiClient.get<Policy[]>('/policies', { params: filters });
  return response.data;
}

export async function fetchPolicy(id: string): Promise<Policy> {
  const response = await apiClient.get<Policy>(`/policies/${id}`);
  return response.data;
}

export async function fetchPolicyVersions(id: string): Promise<Policy[]> {
  const response = await apiClient.get<Policy[]>(`/policies/${id}/versions`);
  return response.data;
}

export async function createPolicy(data: CreatePolicyRequest): Promise<Policy> {
  const response = await apiClient.post<Policy>('/policies', data);
  return response.data;
}

export async function updatePolicy(id: string, data: UpdatePolicyRequest): Promise<Policy> {
  const response = await apiClient.patch<Policy>(`/policies/${id}`, data);
  return response.data;
}

export async function publishPolicy(id: string): Promise<Policy> {
  const response = await apiClient.post<Policy>(`/policies/${id}/publish`);
  return response.data;
}

export async function archivePolicy(id: string): Promise<void> {
  await apiClient.delete(`/policies/${id}`);
}
