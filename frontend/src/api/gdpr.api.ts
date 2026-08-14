import apiClient from './client';
import type {
  ConsentRecord,
  DataSubjectRequest,
  RetentionPolicy,
  SecurityIncident,
  ComplianceReport,
  RecordConsentPayload,
  RevokeConsentPayload,
  CreateDataRequestPayload,
  CreateRetentionPolicyPayload,
  ReportIncidentPayload,
  UpdateIncidentPayload,
} from '@/types/gdpr';

export async function fetchConsents(employeeId: string): Promise<ConsentRecord[]> {
  const response = await apiClient.get<ConsentRecord[]>(`/gdpr/consents/${employeeId}`);
  return response.data;
}

export async function revokeConsent(
  employeeId: string,
  payload: RevokeConsentPayload,
): Promise<ConsentRecord> {
  const response = await apiClient.post<ConsentRecord>(
    `/gdpr/consents/${employeeId}/revoke`,
    payload,
  );
  return response.data;
}

export async function recordConsent(payload: RecordConsentPayload): Promise<ConsentRecord> {
  const response = await apiClient.post<ConsentRecord>('/gdpr/consents', payload);
  return response.data;
}

export async function fetchRequests(): Promise<DataSubjectRequest[]> {
  const response = await apiClient.get<DataSubjectRequest[]>('/gdpr/requests');
  return response.data;
}

export async function createDataRequest(
  payload: CreateDataRequestPayload,
): Promise<DataSubjectRequest> {
  const response = await apiClient.post<DataSubjectRequest>('/gdpr/requests', payload);
  return response.data;
}

export async function completeRequest(id: string, notes?: string): Promise<DataSubjectRequest> {
  const response = await apiClient.patch<DataSubjectRequest>(`/gdpr/requests/${id}/complete`, {
    notes,
  });
  return response.data;
}

export async function rejectRequest(id: string, notes: string): Promise<DataSubjectRequest> {
  const response = await apiClient.patch<DataSubjectRequest>(`/gdpr/requests/${id}/reject`, {
    notes,
  });
  return response.data;
}

export async function fetchRetentionPolicies(): Promise<RetentionPolicy[]> {
  const response = await apiClient.get<RetentionPolicy[]>('/gdpr/retention-policies');
  return response.data;
}

export async function createRetentionPolicy(
  payload: CreateRetentionPolicyPayload,
): Promise<RetentionPolicy> {
  const response = await apiClient.post<RetentionPolicy>('/gdpr/retention-policies', payload);
  return response.data;
}

export async function updateRetentionPolicy(
  id: string,
  isActive: boolean,
): Promise<RetentionPolicy> {
  const response = await apiClient.patch<RetentionPolicy>(`/gdpr/retention-policies/${id}`, {
    isActive,
  });
  return response.data;
}

export async function fetchIncidents(): Promise<SecurityIncident[]> {
  const response = await apiClient.get<SecurityIncident[]>('/gdpr/incidents');
  return response.data;
}

export async function reportIncident(payload: ReportIncidentPayload): Promise<SecurityIncident> {
  const response = await apiClient.post<SecurityIncident>('/gdpr/incidents', payload);
  return response.data;
}

export async function updateIncident(
  id: string,
  payload: UpdateIncidentPayload,
): Promise<SecurityIncident> {
  const response = await apiClient.patch<SecurityIncident>(`/gdpr/incidents/${id}`, payload);
  return response.data;
}

export async function fetchComplianceReport(): Promise<ComplianceReport> {
  const response = await apiClient.get<ComplianceReport>('/gdpr/reports/compliance');
  return response.data;
}
