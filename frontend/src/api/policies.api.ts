import apiClient from './client';
import type {
  Policy,
  PolicyFilters,
  CreatePolicyRequest,
  UpdatePolicyRequest,
  PolicyAcceptanceLog,
  PendingAcceptanceUser,
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

export async function fetchPendingPolicyAcceptances(): Promise<Policy[]> {
  const response = await apiClient.get<Policy[]>('/policies/acceptance/pending');
  return response.data;
}

export async function acceptPolicy(id: string): Promise<void> {
  await apiClient.post(`/policies/${id}/accept`);
}

export async function fetchPolicyAcceptanceLogs(): Promise<PolicyAcceptanceLog[]> {
  const response = await apiClient.get<PolicyAcceptanceLog[]>('/policies/acceptance/logs');
  return response.data;
}

export async function fetchPendingAcceptanceUsers(): Promise<PendingAcceptanceUser[]> {
  const response = await apiClient.get<PendingAcceptanceUser[]>(
    '/policies/acceptance/pending-users',
  );
  return response.data;
}

export async function remindPolicyAcceptance(userId: string): Promise<{ pendingCount: number }> {
  const response = await apiClient.post<{ pendingCount: number }>(
    `/policies/acceptance/remind/${userId}`,
  );
  return response.data;
}
