import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  FolderKanban,
  Clock,
  CalendarDays,
  ArrowRight,
  AlertTriangle,
  Megaphone,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProjectStatus } from '@/types/projects';
import { TimesheetStatus } from '@/types/timesheets';
import { AbsenceStatus } from '@/types/absences';
import { fetchEmployees } from '@/api/users.api';
import { fetchProjects } from '@/api/projects.api';
import { fetchTimesheets } from '@/api/timesheets.api';
import { fetchAbsences } from '@/api/absences.api';
import { fetchWorkflowInbox } from '@/api/workflow.api';
import { fetchCapacityForecast } from '@/api/analytics.api';
import { fetchNotifications } from '@/api/notifications.api';
import { fetchAnnouncements } from '@/api/announcements.api';
import { fetchMonthView } from '@/api/calendar.api';
import { fetchOpenOpportunities } from '@/api/opportunities.api';
import { useAuthStore } from '@/stores/auth.store';
import type { WorkflowItem } from '@/types/workflow';
import type { Notification } from '@/types/notifications';
import { brandTokens } from '@/theme/brandTokens';

const typeLabelMap: Record<string, string> = {
  TIMESHEET: 'Timesheet',
  ABSENCE: 'Ausência',
  EXPENSE: 'Despesa',
};

export function DashboardPage(): React.JSX.Element {
  const navigate = useNavigate();
  const permissions = useAuthStore((state) => state.permissions);
  const isAdmin = permissions.includes('admin:*') || permissions.some((p) => p.startsWith('admin'));
  const isManagerOrAdmin = isAdmin || permissions.includes('manager');

  const { data: employeesData } = useQuery({
    queryKey: ['employees', { status: 'active', limit: 1 }],
    queryFn: () => fetchEmployees({ status: 'active', limit: 1 }),
    enabled: isManagerOrAdmin,
  });

  const { data: projects } = useQuery({
    queryKey: ['projects', { status: 'active' }],
    queryFn: () => fetchProjects({ status: ProjectStatus.ACTIVE }),
  });

  const { data: pendingTimesheets } = useQuery({
    queryKey: ['timesheets', { status: 'submitted' }],
    queryFn: () => fetchTimesheets({ status: TimesheetStatus.SUBMITTED }),
  });

  const { data: pendingAbsences } = useQuery({
    queryKey: ['absences', { status: 'pending' }],
    queryFn: () => fetchAbsences({ status: AbsenceStatus.PENDING }),
  });

  const { data: pendingItems } = useQuery({
    queryKey: ['workflow-inbox'],
    queryFn: () => fetchWorkflowInbox(),
  });

  const { data: forecast } = useQuery({
    queryKey: ['capacity-forecast'],
    queryFn: () => fetchCapacityForecast(6),
    enabled: isManagerOrAdmin,
  });

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications', 1, 50],
    queryFn: () => fetchNotifications(1, 50),
  });

  const announcementsQuery = useInfiniteQuery({
    queryKey: ['announcements', 'dashboard'],
    queryFn: ({ pageParam }) => fetchAnnouncements(pageParam, 5),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => (page.hasMore ? page.nextCursor : undefined),
  });

  const { data: calendarEvents } = useQuery({
    queryKey: ['calendar', 'dashboard', new Date().getFullYear(), new Date().getMonth() + 1],
    queryFn: () => fetchMonthView(new Date().getFullYear(), new Date().getMonth() + 1),
  });

  const { data: currentTimesheets } = useQuery({
    queryKey: ['timesheets', 'dashboard', new Date().getFullYear(), new Date().getMonth() + 1],
    queryFn: () =>
      fetchTimesheets({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 }),
  });

  const { data: opportunities } = useQuery({
    queryKey: ['opportunities', 'open'],
    queryFn: fetchOpenOpportunities,
  });

  const alerts: Notification[] = (notificationsData?.items ?? []).filter(
    (n) =>
      n.type.includes('contract') || n.type.includes('project') || n.type.includes('allocation'),
  );

  const chartData =
    forecast?.map((f) => ({
      month: f.month,
      Alocada: f.allocatedCapacity,
      Disponivel: f.availableCapacity,
    })) ?? [];

  const announcementItems = announcementsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const missingHours = (currentTimesheets ?? []).reduce(
    (total, period) => total + Math.max(0, period.totalPlannedHours - period.totalWorkedHours),
    0,
  );

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Visão geral do sistema de gestão de recursos humanos"
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Colaboradores Ativos
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{String(employeesData?.total ?? '-')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Projetos Ativos
            </CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{String(projects?.length ?? '-')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Timesheets Pendentes
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{String(pendingTimesheets?.length ?? '-')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ausências Pendentes
            </CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{String(pendingAbsences?.length ?? '-')}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ocupação da Equipa</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Alocada" stackId="a" fill="#3D7DB9" />
                  <Bar dataKey="Disponivel" stackId="a" fill="#E8F0F8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center">
                <LoadingSpinner />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Pendentes de Aprovação</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => void navigate('/workflow/inbox')}>
              Ver todas <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {!pendingItems ? (
              <LoadingSpinner />
            ) : pendingItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum item pendente.
              </p>
            ) : (
              <ul className="divide-y">
                {pendingItems.slice(0, 5).map((item: WorkflowItem) => (
                  <li key={item.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">{typeLabelMap[item.type] ?? item.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.requestedAt
                          ? new Date(item.requestedAt).toLocaleDateString('pt-PT')
                          : '-'}
                      </p>
                    </div>
                    <StatusBadge label="Pendente" variant="warning" />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Megaphone className="h-4 w-4" style={{ color: brandTokens.colors.emerald600 }} />
              Comunicados publicados
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => void navigate('/announcements')}>
              Ver mural <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="max-h-80 space-y-3 overflow-y-auto pr-2">
              {announcementItems.map((announcement) => (
                <article key={announcement.id} className="rounded-md border p-3">
                  <p className="text-sm font-semibold">{announcement.title}</p>
                  <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                    {announcement.body}
                  </p>
                </article>
              ))}
              {announcementsQuery.hasNextPage && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void announcementsQuery.fetchNextPage()}
                  disabled={announcementsQuery.isFetchingNextPage}
                >
                  {announcementsQuery.isFetchingNextPage ? 'A carregar...' : 'Carregar mais'}
                </Button>
              )}
              {announcementItems.length === 0 && (
                <p className="py-6 text-sm text-muted-foreground">Ainda não existem comunicados.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Horas em falta</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{missingHours.toFixed(1)}h</p>
            <p className="mt-1 text-sm text-muted-foreground">Por registar no período atual</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Próximos eventos do calendário</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(calendarEvents ?? []).slice(0, 8).map((event) => (
                <div key={event.id} className="rounded-md border p-3">
                  <p className="text-sm font-medium">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(event.date).toLocaleDateString('pt-PT')}
                  </p>
                </div>
              ))}
              {(calendarEvents ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">Sem eventos neste mês.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Oportunidades em aberto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(opportunities ?? []).slice(0, 5).map((opportunity) => (
                <div key={opportunity.id} className="rounded-md border p-3">
                  <p className="text-sm font-medium">{opportunity.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {opportunity.location ?? 'Localização não definida'}
                  </p>
                </div>
              ))}
              {(opportunities ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">Sem oportunidades abertas.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Alertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {alerts.slice(0, 10).map((alert: Notification) => (
                <li key={alert.id} className="py-3">
                  <p className="text-sm font-medium">{alert.title}</p>
                  <p className="text-xs text-muted-foreground">{alert.body}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
