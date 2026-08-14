import apiClient from './client';
import type {
  CapacityOverviewEntry,
  CapacityAlerts,
  CapacityCalendarEntry,
  Team,
} from '@/types/capacity';

interface CapacityParams {
  period?: string;
  teamId?: string;
  employeeId?: string;
}

export async function fetchCapacityOverview(
  params?: CapacityParams,
): Promise<CapacityOverviewEntry[]> {
  const response = await apiClient.get<CapacityOverviewEntry[]>('/capacity/overview', { params });
  return response.data;
}

export async function fetchCapacityAlerts(
  params?: Pick<CapacityParams, 'period' | 'teamId'>,
): Promise<CapacityAlerts> {
  const response = await apiClient.get<CapacityAlerts>('/capacity/alerts', { params });
  return response.data;
}

export async function fetchCapacityCalendar(
  params?: CapacityParams,
): Promise<CapacityCalendarEntry[]> {
  const response = await apiClient.get<CapacityCalendarEntry[]>('/capacity/calendar', { params });
  return response.data;
}

export async function fetchTeams(): Promise<Team[]> {
  const response = await apiClient.get<Team[]>('/teams');
  return response.data;
}
