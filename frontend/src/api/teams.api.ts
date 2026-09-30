import apiClient from './client';
import type { EmployeeTeamMembership } from '@/types/teams';

export async function fetchMyTeams(): Promise<EmployeeTeamMembership[]> {
  const response = await apiClient.get<EmployeeTeamMembership[]>('/teams/me');
  return response.data;
}
