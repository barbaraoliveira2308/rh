import apiClient from './client';
import type { OpenOpportunity } from '@/types/opportunities';

export async function fetchOpenOpportunities(): Promise<OpenOpportunity[]> {
  const response = await apiClient.get<OpenOpportunity[]>('/opportunities/open');
  return response.data;
}
