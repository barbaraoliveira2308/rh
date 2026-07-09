import apiClient from './client';
import type {
  TimesheetPeriod,
  TimesheetFilters,
  CreateTimesheetEntryRequest,
  ApproveTimesheetRequest,
  RejectTimesheetRequest,
  BulkApproveRequest,
} from '@/types/timesheets';

export async function fetchTimesheets(filters?: TimesheetFilters): Promise<TimesheetPeriod[]> {
  const response = await apiClient.get<TimesheetPeriod[]>('/timesheets', { params: filters });
  return response.data;
}

export async function fetchTimesheet(id: string): Promise<TimesheetPeriod> {
  const response = await apiClient.get<TimesheetPeriod>(`/timesheets/${id}`);
  return response.data;
}

export async function updateTimesheetEntry(
  timesheetId: string,
  entryId: string,
  data: CreateTimesheetEntryRequest,
): Promise<TimesheetPeriod> {
  const response = await apiClient.patch<TimesheetPeriod>(
    `/timesheets/${timesheetId}/entries/${entryId}`,
    data,
  );
  return response.data;
}

export async function submitTimesheet(id: string): Promise<TimesheetPeriod> {
  const response = await apiClient.post<TimesheetPeriod>(`/timesheets/${id}/submit`);
  return response.data;
}

export async function approveTimesheet(
  id: string,
  data: ApproveTimesheetRequest,
): Promise<TimesheetPeriod> {
  const response = await apiClient.post<TimesheetPeriod>(`/timesheets/${id}/approve`, data);
  return response.data;
}

export async function rejectTimesheet(
  id: string,
  data: RejectTimesheetRequest,
): Promise<TimesheetPeriod> {
  const response = await apiClient.post<TimesheetPeriod>(`/timesheets/${id}/reject`, data);
  return response.data;
}

export async function bulkApproveTimesheets(data: BulkApproveRequest): Promise<TimesheetPeriod[]> {
  const response = await apiClient.post<TimesheetPeriod[]>('/timesheets/bulk-approve', data);
  return response.data;
}

export function getTimesheetExportUrl(month: string, format = 'xlsx'): string {
  const baseUrl = apiClient.defaults.baseURL ?? '';
  return `${baseUrl}/timesheets/export?month=${month}&format=${format}`;
}
