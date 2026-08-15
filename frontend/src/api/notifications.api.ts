import apiClient from './client';
import type {
  Notification,
  NotificationListResponse,
  NotificationPreference,
  UpdatePreferencePayload,
} from '@/types/notifications';

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

export async function fetchUnreadCount(): Promise<{ count: number }> {
  const response = await apiClient.get<{ count: number }>('/notifications/unread-count');
  return response.data;
}

export async function fetchNotificationPreferences(): Promise<NotificationPreference[]> {
  const response = await apiClient.get<NotificationPreference[]>('/notifications/preferences');
  return response.data;
}

export async function updateNotificationPreferences(
  payload: UpdatePreferencePayload[],
): Promise<NotificationPreference[]> {
  const response = await apiClient.patch<NotificationPreference[]>(
    '/notifications/preferences',
    payload,
  );
  return response.data;
}
