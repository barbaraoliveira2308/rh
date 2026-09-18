import apiClient from './client';
import type { Announcement, AnnouncementFeed, AnnouncementFormField } from '@/types/announcements';
import type { AnnouncementAsset, AnnouncementAssetType } from '@/types/announcements';

export interface CreateAnnouncementRequest {
  title: string;
  body?: string;
  bodyBlocks?: Record<string, unknown>[];
  forms?: { title: string; fields: AnnouncementFormField[] }[];
}

export async function fetchAnnouncements(cursor?: string, limit = 10): Promise<AnnouncementFeed> {
  const response = await apiClient.get<AnnouncementFeed>('/announcements', {
    params: { cursor, limit },
  });
  return response.data;
}

export async function createAnnouncement(
  payload: CreateAnnouncementRequest,
): Promise<Announcement> {
  const response = await apiClient.post<Announcement>('/announcements', payload);
  return response.data;
}

export async function addAnnouncementLink(
  announcementId: string,
  assetType: AnnouncementAssetType,
  url: string,
): Promise<AnnouncementAsset> {
  const response = await apiClient.post<AnnouncementAsset>(
    `/announcements/${announcementId}/assets/link`,
    { assetType, url },
  );
  return response.data;
}

export async function uploadAnnouncementAsset(
  announcementId: string,
  assetType: AnnouncementAssetType,
  file: File,
): Promise<AnnouncementAsset> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post<AnnouncementAsset>(
    `/announcements/${announcementId}/assets/upload`,
    formData,
    { params: { assetType }, headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return response.data;
}

export async function fetchAnnouncementAssetBlob(url: string): Promise<Blob> {
  const response = await apiClient.get<Blob>(url, { responseType: 'blob' });
  return response.data;
}

export async function respondToAnnouncementForm(
  formId: string,
  answers: Record<string, unknown>,
): Promise<unknown> {
  const response = await apiClient.post(`/announcements/forms/${formId}/responses`, { answers });
  return response.data;
}
