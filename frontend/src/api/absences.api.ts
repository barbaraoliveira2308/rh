import apiClient from './client';
import type {
  AbsenceRequest,
  AbsenceType,
  LeaveBalance,
  AbsenceFilters,
  CreateAbsenceRequest,
  ApproveAbsenceRequest,
  RejectAbsenceRequest,
} from '@/types/absences';

export async function fetchAbsences(filters?: AbsenceFilters): Promise<AbsenceRequest[]> {
  const { employeeId, ...queryFilters } = filters ?? {};
  const params = employeeId ? { ...queryFilters, employee_id: employeeId } : queryFilters;
  const response = await apiClient.get<AbsenceRequest[]>('/absences', { params });
  return response.data;
}

export async function fetchAbsence(id: string): Promise<AbsenceRequest> {
  const response = await apiClient.get<AbsenceRequest>(`/absences/${id}`);
  return response.data;
}

export async function createAbsence(data: CreateAbsenceRequest): Promise<AbsenceRequest> {
  const response = await apiClient.post<AbsenceRequest>('/absences', data);
  return response.data;
}

export async function approveAbsence(
  id: string,
  data: ApproveAbsenceRequest,
): Promise<AbsenceRequest> {
  const response = await apiClient.post<AbsenceRequest>(`/absences/${id}/approve`, data);
  return response.data;
}

export async function rejectAbsence(
  id: string,
  data: RejectAbsenceRequest,
): Promise<AbsenceRequest> {
  const response = await apiClient.post<AbsenceRequest>(`/absences/${id}/reject`, data);
  return response.data;
}

export async function cancelAbsence(id: string): Promise<AbsenceRequest> {
  const response = await apiClient.post<AbsenceRequest>(`/absences/${id}/cancel`);
  return response.data;
}

export async function uploadAbsenceDocument(
  id: string,
  documentUrl: string,
): Promise<AbsenceRequest> {
  const response = await apiClient.post<AbsenceRequest>(`/absences/${id}/document`, {
    documentUrl,
  });
  return response.data;
}

export async function fetchLeaveBalance(
  employeeId: string,
  year?: number,
): Promise<LeaveBalance[]> {
  const response = await apiClient.get<LeaveBalance[]>(`/absences/balance/${employeeId}`, {
    params: year ? { year } : undefined,
  });
  return response.data;
}

export async function fetchAbsenceCalendar(month?: string): Promise<AbsenceRequest[]> {
  const response = await apiClient.get<AbsenceRequest[]>('/absences/calendar', {
    params: month ? { month } : undefined,
  });
  return response.data;
}

export async function fetchAbsenceTypes(): Promise<AbsenceType[]> {
  const response = await apiClient.get<AbsenceType[]>('/absences/types');
  return response.data;
}
