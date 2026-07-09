import apiClient from './client';
import type {
  ConsultantMargin,
  MonthlyRevenue,
  TopPerformingProject,
  TeamOccupancy,
  CapacityForecast,
} from '@/types/analytics';

interface MarginsParams {
  employeeId?: string;
  period?: string;
}

interface RevenueParams {
  year?: number;
}

export async function fetchConsultantMargins(params?: MarginsParams): Promise<ConsultantMargin[]> {
  const response = await apiClient.get<ConsultantMargin[]>('/analytics/financials/margins', {
    params,
  });
  return response.data;
}

export async function fetchMonthlyRevenue(params?: RevenueParams): Promise<MonthlyRevenue[]> {
  const response = await apiClient.get<MonthlyRevenue[]>('/analytics/financials/revenue', {
    params,
  });
  return response.data;
}

export async function fetchTopProjects(limit = 10): Promise<TopPerformingProject[]> {
  const response = await apiClient.get<TopPerformingProject[]>(
    '/analytics/financials/top-projects',
    { params: { limit } },
  );
  return response.data;
}

export async function fetchTeamOccupancy(params?: {
  teamId?: string;
  month?: string;
}): Promise<TeamOccupancy[]> {
  const response = await apiClient.get<TeamOccupancy[]>('/analytics/resources/occupancy', {
    params,
  });
  return response.data;
}

export async function fetchCapacityForecast(months = 3): Promise<CapacityForecast[]> {
  const response = await apiClient.get<CapacityForecast[]>('/analytics/resources/forecast', {
    params: { months: String(months) },
  });
  return response.data;
}
