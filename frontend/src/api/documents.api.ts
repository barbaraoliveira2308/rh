import apiClient from './client';
import type { DocumentCategory, ProfileDocument } from '@/types/documents';

export async function fetchMyDocuments(ownerId: string): Promise<ProfileDocument[]> {
  const response = await apiClient.get<ProfileDocument[]>('/documents', {
    params: { ownerId },
  });
  return response.data;
}

export async function uploadMyDocument(
  file: File,
  category: DocumentCategory,
): Promise<ProfileDocument> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', file.name);
  formData.append('category', category);
  const response = await apiClient.post<ProfileDocument>('/documents/me', formData, {
    headers: { 'Content-Type': undefined },
  });
  return response.data;
}

export async function fetchCourseDocuments(): Promise<ProfileDocument[]> {
  const response = await apiClient.get<ProfileDocument[]>('/documents', {
    params: { category: 'training' },
  });
  return response.data;
}

export async function uploadCourseAsset(file: File, courseId: string): Promise<ProfileDocument> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post<ProfileDocument>(
    `/documents/courses/${courseId}`,
    formData,
    { headers: { 'Content-Type': undefined } },
  );
  return response.data;
}

export async function downloadDocument(documentId: string): Promise<Blob> {
  const response = await apiClient.get<Blob>(`/documents/${documentId}/download`, {
    responseType: 'blob',
  });
  return response.data;
}
