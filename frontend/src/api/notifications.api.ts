import apiClient from './client';
import type { Notification, NotificationListResponse } from '@/types/notifications';

export async function fetchNotifications(page = 1, limit = 20): Promise<NotificationListResponse> {
  const response = await apiClient.get<NotificationListResponse>('/notifications', {
    params: { page, limit },
  });
  return response.data;
}

export async function markNotificationRead(id: string): Promise<Notification> {
  const response = await apiClient.patch<Notification>(`/notifications/${id}/read`);
  return response.data;
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.post('/notifications/read-all');
}
