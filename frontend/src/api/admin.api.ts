import apiClient from './client';
import type {
  SystemSetting,
  UpdateSystemSettingsRequest,
  LegalEntity,
  CreateLegalEntityRequest,
  UpdateLegalEntityRequest,
} from '@/types/admin';

export async function fetchSettings(): Promise<SystemSetting> {
  const response = await apiClient.get<SystemSetting>('/admin/settings');
  return response.data;
}

export async function updateSettings(data: UpdateSystemSettingsRequest): Promise<SystemSetting> {
  const response = await apiClient.put<SystemSetting>('/admin/settings', data);
  return response.data;
}

export async function fetchLegalEntities(): Promise<LegalEntity[]> {
  const response = await apiClient.get<LegalEntity[]>('/admin/legal-entities');
  return response.data;
}

export async function createLegalEntity(data: CreateLegalEntityRequest): Promise<LegalEntity> {
  const response = await apiClient.post<LegalEntity>('/admin/legal-entities', data);
  return response.data;
}

export async function updateLegalEntity(
  id: string,
  data: UpdateLegalEntityRequest,
): Promise<LegalEntity> {
  const response = await apiClient.patch<LegalEntity>(`/admin/legal-entities/${id}`, data);
  return response.data;
}
