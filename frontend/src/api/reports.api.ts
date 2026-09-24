import apiClient, { BACKGROUND_REQUEST } from './client';
import { ReportFormat, type ReportJob, type ReportResult } from '@/types/reports';
import type { ScheduledReport, CreateScheduledReportPayload } from '@/types/reports';

function extractFilename(disposition: unknown, fallback: string): string {
  const value = typeof disposition === 'string' ? disposition : '';
  const match = /filename="([^"]+)"/.exec(value);
  return match?.[1] ?? fallback;
}

async function requestReport(
  url: string,
  params: Record<string, unknown>,
  format: ReportFormat,
): Promise<ReportResult> {
  if (format === ReportFormat.JSON) {
    const response = await apiClient.get<Record<string, unknown>[]>(url, {
      params: { ...params, format },
    });
    return { kind: 'data', rows: response.data };
  }

  const response = await apiClient.get<Blob>(url, {
    params: { ...params, format },
    responseType: 'blob',
  });

  const contentType = String(response.headers['content-type'] ?? '');

  if (contentType.includes('application/json')) {
    const text = await response.data.text();
    const parsed = JSON.parse(text) as { jobId: string };
    return { kind: 'job', jobId: parsed.jobId };
  }

  const filename = extractFilename(response.headers['content-disposition'], `relatorio.${format}`);
  return { kind: 'file', blob: response.data, filename };
}

export interface PeriodFilters {
  from?: string;
  to?: string;
  employeeId?: string;
  [key: string]: unknown;
}

export async function generateTimesheetsReport(
  params: PeriodFilters & { projectId?: string },
  format: ReportFormat,
): Promise<ReportResult> {
  return requestReport('/reports/timesheets', params, format);
}

export async function generateAbsencesReport(
  params: PeriodFilters & { typeId?: string },
  format: ReportFormat,
): Promise<ReportResult> {
  return requestReport('/reports/absences', params, format);
}

export async function generateExpensesReport(
  params: PeriodFilters & { categoryId?: string },
  format: ReportFormat,
): Promise<ReportResult> {
  return requestReport('/reports/expenses', params, format);
}

export async function generateProjectHoursReport(
  projectId: string,
  period: string,
  format: ReportFormat,
): Promise<ReportResult> {
  return requestReport(`/reports/projects/${projectId}/hours`, { period }, format);
}

export async function generateTeamOccupancyReport(
  teamId: string,
  period: string,
  format: ReportFormat,
): Promise<ReportResult> {
  return requestReport(`/reports/teams/${teamId}/occupancy`, { period }, format);
}

export async function generateMarginsReport(
  period: string,
  format: ReportFormat,
): Promise<ReportResult> {
  return requestReport('/reports/financials/margins', { period }, format);
}

export async function generateContractsExpiringReport(
  days: number,
  format: ReportFormat,
): Promise<ReportResult> {
  return requestReport('/reports/contracts/expiring', { days }, format);
}

export async function generateAuditReport(
  params: PeriodFilters & { userId?: string; action?: string },
  format: ReportFormat,
): Promise<ReportResult> {
  return requestReport('/reports/audit', params, format);
}

export async function fetchReportJob(jobId: string): Promise<ReportJob> {
  const response = await apiClient.get<ReportJob>(`/reports/jobs/${jobId}`, BACKGROUND_REQUEST);
  return response.data;
}

export async function downloadReportJobFile(jobId: string): Promise<Blob> {
  const response = await apiClient.get<Blob>(`/reports/jobs/${jobId}/download`, {
    responseType: 'blob',
  });
  return response.data;
}

export async function fetchSchedules(): Promise<ScheduledReport[]> {
  const response = await apiClient.get<ScheduledReport[]>('/reports/schedules');
  return response.data;
}

export async function createSchedule(
  payload: CreateScheduledReportPayload,
): Promise<ScheduledReport> {
  const response = await apiClient.post<ScheduledReport>('/reports/schedules', payload);
  return response.data;
}

export async function deleteSchedule(id: string): Promise<void> {
  await apiClient.delete(`/reports/schedules/${id}`);
}
