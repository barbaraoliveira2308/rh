import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Mail, Bell as BellIcon } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  fetchNotificationPreferences,
  updateNotificationPreferences,
} from '@/api/notifications.api';
import { NOTIFICATION_TYPE_LABELS, type Notification } from '@/types/notifications';

const PAGE_SIZE = 20;

function formatDate(value: string): string {
  return new Date(value).toLocaleString('pt-PT');
}

export function NotificationsPage(): React.JSX.Element {
  return (
    <div>
      <PageHeader
        title="Notificações"
        description="Centro de notificações e preferências de envio"
      />

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Notificações</TabsTrigger>
          <TabsTrigger value="preferences">Preferências</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <NotificationsListTab />
        </TabsContent>
        <TabsContent value="preferences">
          <PreferencesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NotificationsListTab(): React.JSX.Element {
  const queryClient = useQueryClient();
  const [page, setPage] = React.useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', page],
    queryFn: () => fetchNotifications(page, PAGE_SIZE),
  });

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const hasUnread = (data?.items ?? []).some((item) => item.status !== 'read');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">As Minhas Notificações</CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            markAllMutation.mutate();
          }}
          disabled={markAllMutation.isPending || !hasUnread}
        >
          Marcar todas como lidas
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingSpinner />
        ) : (data?.items ?? []).length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">Não tem notificações.</p>
        ) : (
          <div className="space-y-3">
            {(data?.items ?? []).map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                onMarkRead={() => {
                  markReadMutation.mutate(notification.id);
                }}
                isMarking={markReadMutation.isPending}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <div className="text-sm text-muted-foreground">
              Página {page} de {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setPage((p) => Math.max(1, p - 1));
                }}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setPage((p) => Math.min(totalPages, p + 1));
                }}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NotificationRow({
  notification,
  onMarkRead,
  isMarking,
}: {
  notification: Notification;
  onMarkRead: () => void;
  isMarking: boolean;
}): React.JSX.Element {
  const isRead = notification.status === 'read';

  return (
    <div
      className={`flex items-start justify-between gap-4 rounded-md border p-4 ${
        isRead ? '' : 'bg-muted/40'
      }`}
    >
      <div className="flex items-start gap-3">
        <BellIcon
          className={`mt-0.5 h-4 w-4 ${isRead ? 'text-muted-foreground' : 'text-brand-800'}`}
        />
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{notification.title}</span>
            <StatusBadge
              label={NOTIFICATION_TYPE_LABELS[notification.type] ?? notification.type}
              variant="neutral"
            />
            {!isRead && <StatusBadge label="Nova" variant="info" />}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{notification.body}</p>
          <p className="mt-1 text-xs text-muted-foreground">{formatDate(notification.createdAt)}</p>
        </div>
      </div>
      {!isRead && (
        <Button size="sm" variant="outline" onClick={onMarkRead} disabled={isMarking}>
          Marcar como lida
        </Button>
      )}
    </div>
  );
}

function PreferencesTab(): React.JSX.Element {
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: fetchNotificationPreferences,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: {
      notificationType: string;
      emailEnabled?: boolean;
      inAppEnabled?: boolean;
    }) => updateNotificationPreferences([payload]),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });

  const preferenceByType = new Map(
    (preferences ?? []).map((pref) => [pref.notificationType, pref]),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Preferências de Notificação</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipo</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                    <div className="flex items-center justify-center gap-1">
                      <BellIcon className="h-4 w-4" /> In-App
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                    <div className="flex items-center justify-center gap-1">
                      <Mail className="h-4 w-4" /> Email
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(NOTIFICATION_TYPE_LABELS).map(([type, label]) => {
                  const pref = preferenceByType.get(type);
                  const inAppEnabled = pref?.inAppEnabled ?? true;
                  const emailEnabled = pref?.emailEnabled ?? true;

                  return (
                    <tr key={type} className="border-b last:border-b-0">
                      <td className="px-4 py-3">{label}</td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={inAppEnabled}
                          disabled={updateMutation.isPending}
                          onChange={(e) => {
                            updateMutation.mutate({
                              notificationType: type,
                              inAppEnabled: e.target.checked,
                            });
                          }}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={emailEnabled}
                          disabled={updateMutation.isPending}
                          onChange={(e) => {
                            updateMutation.mutate({
                              notificationType: type,
                              emailEnabled: e.target.checked,
                            });
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          Por omissão, todos os tipos de notificação têm ambos os canais ativos.
        </p>
      </CardContent>
    </Card>
  );
}
