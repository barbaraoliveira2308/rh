import apiClient from './client';
import type {
  CalendarEvent,
  PublicHoliday,
  CompanyEvent,
  BlockedPeriod,
  CreatePublicHolidayRequest,
  CreateCompanyEventRequest,
  CreateBlockedPeriodRequest,
} from '@/types/calendar';

export async function fetchMonthView(
  year: number,
  month: number,
  teamId?: string,
): Promise<CalendarEvent[]> {
  const response = await apiClient.get<CalendarEvent[]>('/calendar', {
    params: { year, month, teamId },
  });
  return response.data;
}

export async function fetchHolidays(year?: number, countryCode?: string): Promise<PublicHoliday[]> {
  const response = await apiClient.get<PublicHoliday[]>('/calendar/holidays', {
    params: { year, countryCode },
  });
  return response.data;
}

export async function importHolidays(year: number): Promise<{ imported: number }> {
  const response = await apiClient.post<{ imported: number }>(
    '/calendar/holidays/import',
    undefined,
    { params: { year } },
  );
  return response.data;
}

export async function createHoliday(data: CreatePublicHolidayRequest): Promise<PublicHoliday> {
  const response = await apiClient.post<PublicHoliday>('/calendar/holidays', data);
  return response.data;
}

export async function fetchCompanyEvents(): Promise<CompanyEvent[]> {
  const response = await apiClient.get<CompanyEvent[]>('/calendar/events');
  return response.data;
}

export async function createCompanyEvent(data: CreateCompanyEventRequest): Promise<CompanyEvent> {
  const response = await apiClient.post<CompanyEvent>('/calendar/events', data);
  return response.data;
}

export async function updateCompanyEvent(
  id: string,
  data: CreateCompanyEventRequest,
): Promise<CompanyEvent> {
  const response = await apiClient.patch<CompanyEvent>(`/calendar/events/${id}`, data);
  return response.data;
}

export async function deleteCompanyEvent(id: string): Promise<void> {
  await apiClient.delete(`/calendar/events/${id}`);
}

export async function fetchBlockedPeriods(): Promise<BlockedPeriod[]> {
  const response = await apiClient.get<BlockedPeriod[]>('/calendar/blocked-periods');
  return response.data;
}

export async function createBlockedPeriod(
  data: CreateBlockedPeriodRequest,
): Promise<BlockedPeriod> {
  const response = await apiClient.post<BlockedPeriod>('/calendar/blocked-periods', data);
  return response.data;
}

export async function deleteBlockedPeriod(id: string): Promise<void> {
  await apiClient.delete(`/calendar/blocked-periods/${id}`);
}
