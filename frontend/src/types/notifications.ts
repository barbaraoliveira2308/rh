export interface Notification {
  id: string;
  recipientId: string;
  type: string;
  title: string;
  body: string;
  channel: 'in_app' | 'email';
  status: 'pending' | 'sent' | 'failed' | 'read';
  referenceId: string | null;
  referenceType: string | null;
  sentAt: string | null;
  readAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListResponse {
  items: Notification[];
  total: number;
}
