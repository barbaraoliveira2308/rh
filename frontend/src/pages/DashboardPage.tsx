import * as React from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
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
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { AnnouncementAssetPreview } from '@/components/AnnouncementAssetPreview';
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
  const announcementsEndRef = React.useRef<HTMLDivElement | null>(null);
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

  React.useEffect(() => {
    const element = announcementsEndRef.current;
    if (!element) return;
    const observer = new IntersectionObserver((entries): void => {
      if (
        entries[0]?.isIntersecting &&
        announcementsQuery.hasNextPage &&
        !announcementsQuery.isFetchingNextPage
      ) {
        void announcementsQuery.fetchNextPage();
      }
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [announcementsQuery]);

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

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          mb: 3,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
        }}
      >
        {[
          { label: 'Colaboradores Ativos', value: employeesData?.total ?? '-', icon: Users },
          { label: 'Projetos Ativos', value: projects?.length ?? '-', icon: FolderKanban },
          { label: 'Timesheets Pendentes', value: pendingTimesheets?.length ?? '-', icon: Clock },
          {
            label: 'Ausências Pendentes',
            value: pendingAbsences?.length ?? '-',
            icon: CalendarDays,
          },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent>
              <Box
                sx={{
                  alignItems: 'center',
                  display: 'flex',
                  justifyContent: 'space-between',
                  mb: 1,
                }}
              >
                <Typography color="text.secondary" variant="body2">
                  {label}
                </Typography>
                <Icon color="action" size={18} />
              </Box>
              <Typography variant="h4">{String(value)}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          mb: 3,
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' },
        }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Ocupação da Equipa</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorAlocada" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3D7DB9" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3D7DB9" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="colorDisponivel" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8FC1E3" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#8FC1E3" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" fontSize={12} tickLine={false} />
                  <YAxis fontSize={12} tickLine={false} width={32} />
                  <Tooltip />
                  <Area
                    dataKey="Alocada"
                    fill="url(#colorAlocada)"
                    stackId="a"
                    stroke="#3D7DB9"
                    type="monotone"
                  />
                  <Area
                    dataKey="Disponivel"
                    fill="url(#colorDisponivel)"
                    stackId="a"
                    stroke="#8FC1E3"
                    type="monotone"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Box
                sx={{
                  alignItems: 'center',
                  display: 'flex',
                  height: 220,
                  justifyContent: 'center',
                }}
              >
                <LoadingSpinner />
              </Box>
            )}
          </CardContent>
        </Card>

        <Card>
          <Box
            sx={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between', p: 2 }}
          >
            <CardTitle>Pendentes de Aprovação</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => void navigate('/workflow/inbox')}>
              Ver todas <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Box>
          <CardContent>
            {!pendingItems ? (
              <LoadingSpinner />
            ) : pendingItems.length === 0 ? (
              <Typography
                color="text.secondary"
                sx={{ py: 4, textAlign: 'center' }}
                variant="body2"
              >
                Nenhum item pendente.
              </Typography>
            ) : (
              <Stack divider={<Box sx={{ borderBottom: 1, borderColor: 'divider' }} />}>
                {pendingItems.slice(0, 5).map((item: WorkflowItem) => (
                  <Box
                    key={item.id}
                    sx={{
                      alignItems: 'center',
                      display: 'flex',
                      justifyContent: 'space-between',
                      py: 1.5,
                    }}
                  >
                    <Box>
                      <Typography variant="body2">
                        {typeLabelMap[item.type] ?? item.type}
                      </Typography>
                      <Typography color="text.secondary" variant="caption">
                        {item.requestedAt
                          ? new Date(item.requestedAt).toLocaleDateString('pt-PT')
                          : '-'}
                      </Typography>
                    </Box>
                    <StatusBadge label="Pendente" variant="warning" />
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Box>

      <Box
        sx={{
          alignItems: 'start',
          display: 'grid',
          gap: 3,
          mb: 3,
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, 1fr)' },
        }}
      >
        <Card sx={{ gridColumn: { lg: 'span 2' } }}>
          <Box
            sx={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between', p: 2 }}
          >
            <CardTitle>
              <Box component="span" sx={{ alignItems: 'center', display: 'flex', gap: 1 }}>
                <Megaphone size={18} style={{ color: brandTokens.colors.emerald600 }} />
                Comunicados publicados
              </Box>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => void navigate('/announcements')}>
              Ver mural <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Box>
          <CardContent>
            <Stack spacing={1.5} sx={{ maxHeight: 460, overflowY: 'auto', pr: 1 }}>
              {announcementItems.map((announcement) => (
                <Box
                  key={announcement.id}
                  sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5 }}
                >
                  <Typography variant="body2">{announcement.title}</Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.5 }} variant="body2">
                    {announcement.body}
                  </Typography>
                  {announcement.assets.length > 0 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                      {announcement.assets.map((asset) => (
                        <AnnouncementAssetPreview asset={asset} key={asset.id} maxHeight={360} />
                      ))}
                    </Box>
                  )}
                </Box>
              ))}
              <Box ref={announcementsEndRef} aria-hidden="true" sx={{ minHeight: 8 }} />
              {announcementsQuery.isFetchingNextPage && <LoadingSpinner size={20} />}
              {announcementItems.length === 0 && (
                <Typography color="text.secondary" sx={{ py: 3 }} variant="body2">
                  Ainda não existem comunicados.
                </Typography>
              )}
            </Stack>
          </CardContent>
        </Card>

        <Stack spacing={3}>
          <Card>
            <CardHeader style={{ paddingBottom: 4 }}>
              <CardTitle className="text-base">Horas em falta</CardTitle>
            </CardHeader>
            <CardContent sx={{ pt: 0.5 }}>
              <Typography variant="h5">{missingHours.toFixed(1)}h</Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }} variant="caption">
                Por registar no período atual
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Próximos eventos do calendário</CardTitle>
            </CardHeader>
            <CardContent>
              <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(2, 1fr)' }}>
                {(calendarEvents ?? []).slice(0, 4).map((event) => (
                  <Box
                    key={event.id}
                    sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5 }}
                  >
                    <Typography variant="body2">{event.title}</Typography>
                    <Typography color="text.secondary" variant="caption">
                      {new Date(event.date).toLocaleDateString('pt-PT')}
                    </Typography>
                  </Box>
                ))}
                {(calendarEvents ?? []).length === 0 && (
                  <Typography color="text.secondary" variant="body2">
                    Sem eventos neste mês.
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Oportunidades em aberto</CardTitle>
            </CardHeader>
            <CardContent>
              <Stack spacing={1.5}>
                {(opportunities ?? []).slice(0, 5).map((opportunity) => (
                  <Box
                    key={opportunity.id}
                    sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5 }}
                  >
                    <Typography variant="body2">{opportunity.title}</Typography>
                    <Typography color="text.secondary" variant="caption">
                      {opportunity.location ?? 'Localização não definida'}
                    </Typography>
                  </Box>
                ))}
                {(opportunities ?? []).length === 0 && (
                  <Typography color="text.secondary" variant="body2">
                    Sem oportunidades abertas.
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Box>

      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              <Box component="span" sx={{ alignItems: 'center', display: 'flex', gap: 1 }}>
                <AlertTriangle color="warning" size={18} />
                Alertas
              </Box>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Stack divider={<Box sx={{ borderBottom: 1, borderColor: 'divider' }} />}>
              {alerts.slice(0, 10).map((alert: Notification) => (
                <Box key={alert.id} sx={{ py: 1.5 }}>
                  <Typography variant="body2">{alert.title}</Typography>
                  <Typography color="text.secondary" variant="caption">
                    {alert.body}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
