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

export interface NotificationPreference {
  id: string;
  employeeId: string;
  notificationType: string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePreferencePayload {
  notificationType: string;
  emailEnabled?: boolean;
  inAppEnabled?: boolean;
}

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  'timesheet.submitted': 'Timesheet submetida',
  'timesheet.approved': 'Timesheet aprovada',
  'timesheet.rejected': 'Timesheet rejeitada',
  'absence.requested': 'Pedido de ausência submetido',
  'absence.approved': 'Pedido de ausência aprovado',
  'absence.rejected': 'Pedido de ausência rejeitado',
  'contract.expiring-soon': 'Contrato a expirar',
  'project.ending-alert': 'Projeto próximo do fim',
  'project.allocation-ending-alert': 'Alocação próxima do fim',
  'expense.approved': 'Despesa aprovada',
  'expense.rejected': 'Despesa rejeitada',
  'allocation.overallocation-detected': 'Sobrealocação detetada',
  'timesheet.pending-submission': 'Timesheet por submeter',
};
