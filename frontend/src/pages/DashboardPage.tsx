import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AccountTreeOutlined from '@mui/icons-material/AccountTreeOutlined';
import AccessTimeOutlined from '@mui/icons-material/AccessTimeOutlined';
import BeachAccessOutlined from '@mui/icons-material/BeachAccessOutlined';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { fetchCapacityForecast } from '@/api/analytics.api';
import { fetchMonthView } from '@/api/calendar.api';
import { fetchOpenOpportunities } from '@/api/opportunities.api';
import { fetchProjects } from '@/api/projects.api';
import { fetchAbsences } from '@/api/absences.api';
import { fetchEmployees } from '@/api/users.api';
import { fetchTimesheets } from '@/api/timesheets.api';
import { fetchWorkflowInbox } from '@/api/workflow.api';
import { AnnouncementFeed } from '@/features/announcements/components/AnnouncementFeed';
import { DashboardCharts } from '@/features/dashboard/components/DashboardCharts';
import {
  DashboardHeader,
  type DashboardPeriod,
} from '@/features/dashboard/components/DashboardHeader';
import { KpiCard } from '@/features/dashboard/components/KpiCard';
import { PendingActionsTable } from '@/features/dashboard/components/PendingActionsTable';
import { UpcomingEventsCard } from '@/features/dashboard/components/UpcomingEventsCard';
import {
  buildDepartmentDistribution,
  fetchActiveEmployeeDirectory,
} from '@/features/dashboard/dashboardData';
import { useAuthStore } from '@/stores/auth.store';
import { AbsenceStatus } from '@/types/absences';
import { ProjectStatus } from '@/types/projects';
import { TimesheetStatus } from '@/types/timesheets';

export function DashboardPage(): React.JSX.Element {
  const navigate = useNavigate();
  const permissions = useAuthStore((state) => state.permissions);
  const user = useAuthStore((state) => state.user);
  const isAdmin =
    permissions.includes('admin:*') ||
    permissions.some((permission) => permission.startsWith('admin'));
  const isManagerOrAdmin = isAdmin || permissions.includes('manager');
  const canAddEmployee =
    isAdmin || permissions.includes('users:create') || permissions.includes('users:write');
  const [period, setPeriod] = React.useState<DashboardPeriod>('month');
  const [customStart, setCustomStart] = React.useState('');
  const [customEnd, setCustomEnd] = React.useState('');

  const employeeSummary = useQuery({
    queryKey: ['employees', { status: 'active', limit: 1 }],
    queryFn: () => fetchEmployees({ status: 'active', limit: 1 }),
    enabled: isManagerOrAdmin,
  });
  const employeeDirectory = useQuery({
    queryKey: ['employees', 'dashboard-active-directory'],
    queryFn: fetchActiveEmployeeDirectory,
    enabled: isManagerOrAdmin,
  });
  const projects = useQuery({
    queryKey: ['projects', { status: 'active' }],
    queryFn: () => fetchProjects({ status: ProjectStatus.ACTIVE }),
  });
  const pendingTimesheets = useQuery({
    queryKey: ['timesheets', { status: TimesheetStatus.SUBMITTED }],
    queryFn: () => fetchTimesheets({ status: TimesheetStatus.SUBMITTED }),
  });
  const pendingAbsences = useQuery({
    queryKey: ['absences', { status: AbsenceStatus.PENDING }],
    queryFn: () => fetchAbsences({ status: AbsenceStatus.PENDING }),
  });
  const pendingActions = useQuery({
    queryKey: ['workflow-inbox'],
    queryFn: () => fetchWorkflowInbox(),
  });
  const forecast = useQuery({
    queryKey: ['capacity-forecast', 6],
    queryFn: () => fetchCapacityForecast(6),
    enabled: isManagerOrAdmin,
  });
  const today = new Date();
  const calendar = useQuery({
    queryKey: ['calendar', 'dashboard', today.getFullYear(), today.getMonth() + 1],
    queryFn: () => fetchMonthView(today.getFullYear(), today.getMonth() + 1),
  });
  const timesheets = useQuery({
    queryKey: ['timesheets', 'dashboard', today.getFullYear(), today.getMonth() + 1],
    queryFn: () => fetchTimesheets({ year: today.getFullYear(), month: today.getMonth() + 1 }),
  });
  const opportunities = useQuery({
    queryKey: ['opportunities', 'open'],
    queryFn: fetchOpenOpportunities,
  });

  const directory = employeeDirectory.data ?? [];
  const employeeNames = new Map(
    directory.map((employee) => [employee.id, `${employee.firstName} ${employee.lastName}`.trim()]),
  );
  const departmentDistribution = buildDepartmentDistribution(directory);
  const allForecast = forecast.data ?? [];
  const forecastWindow =
    period === 'last30'
      ? allForecast.slice(0, 1)
      : period === 'quarter'
        ? allForecast.slice(0, 3)
        : period === 'custom' && (customStart || customEnd)
          ? allForecast.filter((point) => {
              const month = point.month.slice(0, 7);
              return (
                (!customStart || month >= customStart.slice(0, 7)) &&
                (!customEnd || month <= customEnd.slice(0, 7))
              );
            })
          : allForecast;
  const missingHours = (timesheets.data ?? []).reduce(
    (total, entry) => total + Math.max(0, entry.totalPlannedHours - entry.totalWorkedHours),
    0,
  );
  const announcementsDepartments = [
    ...new Set(
      directory
        .map((employee) => employee.department?.name)
        .filter((name): name is string => Boolean(name)),
    ),
  ];
  const currentName = user?.username ?? user?.email.split('@')[0] ?? '';
  const responsibleName = user?.username ?? '';

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', xl: 'repeat(12, minmax(0, 1fr))' },
        gap: 1.5,
        minWidth: 0,
      }}
    >
      <Box sx={{ gridColumn: { xl: '1 / -1' }, minWidth: 0 }}>
        <DashboardHeader
          name={currentName}
          period={period}
          onPeriodChange={setPeriod}
          customStart={customStart}
          customEnd={customEnd}
          onCustomRangeChange={(start, end) => {
            setCustomStart(start);
            setCustomEnd(end);
          }}
          onAddEmployee={() => void navigate('/users/new')}
          canAddEmployee={canAddEmployee}
        />
      </Box>
      <Box
        sx={{
          gridColumn: { xl: '1 / -1' },
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
          gap: 1,
          minWidth: 0,
        }}
      >
        <KpiCard
          title="Colaboradores ativos"
          value={employeeSummary.data?.total ?? null}
          detail="Na organização"
          icon={<GroupsOutlined />}
          loading={employeeSummary.isLoading}
          error={employeeSummary.isError}
          unavailable={!isManagerOrAdmin}
        />
        <KpiCard
          title="Projetos em curso"
          value={projects.data?.length ?? null}
          detail="Em execução"
          icon={<AccountTreeOutlined />}
          loading={projects.isLoading}
          error={projects.isError}
        />
        <KpiCard
          title="Horas registadas"
          value={
            timesheets.isLoading
              ? null
              : `${(timesheets.data ?? []).reduce((total, entry) => total + entry.totalWorkedHours, 0).toLocaleString('pt-PT')}h`
          }
          detail="Este período"
          icon={<AccessTimeOutlined />}
          loading={timesheets.isLoading}
          error={timesheets.isError}
        />
        <KpiCard
          title="Pendências"
          value={(pendingTimesheets.data?.length ?? 0) + (pendingAbsences.data?.length ?? 0)}
          detail="Aguardando validação"
          icon={<BeachAccessOutlined />}
          loading={pendingTimesheets.isLoading || pendingAbsences.isLoading}
          error={pendingTimesheets.isError || pendingAbsences.isError}
        />
      </Box>
      <Box sx={{ gridColumn: { xl: '1 / -1' }, minWidth: 0 }}>
        <DashboardCharts
          forecast={forecastWindow}
          distribution={departmentDistribution}
          forecastLoading={forecast.isLoading}
          forecastError={forecast.isError}
          distributionLoading={employeeDirectory.isLoading}
          distributionUnavailable={!isManagerOrAdmin}
        />
      </Box>
      <Box sx={{ gridColumn: { xl: 'span 8' }, minWidth: 0 }}>
        <PendingActionsTable
          items={pendingActions.data ?? []}
          employeeNames={employeeNames}
          responsibleName={responsibleName}
          loading={pendingActions.isLoading}
          error={pendingActions.isError}
          onViewAll={() => void navigate('/workflow/inbox')}
        />
      </Box>
      <Stack spacing={1.5} sx={{ gridColumn: { xl: 'span 4' }, minWidth: 0 }}>
        <Card variant="outlined" sx={{ borderRadius: 1.5, boxShadow: 'none' }}>
          <CardHeader
            title="Horas em falta"
            titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
          />
          <CardContent sx={{ pt: 0 }}>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {timesheets.isLoading
                ? '—'
                : timesheets.isError
                  ? 'Indisponível'
                  : `${missingHours.toFixed(1)}h`}
            </Typography>
            <Typography color="text.secondary" variant="caption">
              Esta semana
            </Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ borderRadius: 1.5, boxShadow: 'none' }}>
          <CardHeader
            title="Oportunidades em aberto"
            titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
          />
          <CardContent sx={{ pt: 0 }}>
            {opportunities.isLoading ? (
              <Typography color="text.secondary" variant="body2">
                A carregar…
              </Typography>
            ) : opportunities.isError ? (
              <Alert severity="error">Erro ao carregar.</Alert>
            ) : (opportunities.data ?? []).length === 0 ? (
              <Typography color="text.secondary" variant="body2">
                Sem oportunidades abertas.
              </Typography>
            ) : (
              <Typography variant="body2">{(opportunities.data ?? [])[0]?.title}</Typography>
            )}
          </CardContent>
        </Card>
      </Stack>
      <Box sx={{ gridColumn: { xl: 'span 8' }, minWidth: 0 }}>
        <AnnouncementFeed
          departments={announcementsDepartments}
          canPublish={isAdmin || permissions.includes('announcements:create')}
        />
      </Box>
      <Stack spacing={1.5} sx={{ gridColumn: { xl: 'span 4' }, minWidth: 0 }}>
        <UpcomingEventsCard
          events={calendar.data ?? []}
          loading={calendar.isLoading}
          error={calendar.isError}
          onOpenCalendar={() => void navigate('/calendar')}
        />
        <Card variant="outlined" sx={{ borderRadius: 1.5, boxShadow: 'none' }}>
          <CardHeader
            title="Filtros e informações"
            titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
          />
          <CardContent sx={{ pt: 0 }}>
            <Typography variant="caption" color="text.secondary">
              Período
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              {period === 'month'
                ? 'Este mês'
                : period === 'last30'
                  ? 'Últimos 30 dias'
                  : period === 'quarter'
                    ? 'Este trimestre'
                    : 'Intervalo personalizado'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Departamentos
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {announcementsDepartments.length || 'Todos'} disponíveis
            </Typography>
          </CardContent>
        </Card>
        <Card
          variant="outlined"
          sx={{ borderRadius: 1.5, boxShadow: 'none', bgcolor: 'primary.50' }}
        >
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Precisa de ajuda?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Aceda ao Helpdesk para reportar incidentes.
            </Typography>
            <Button
              size="small"
              variant="outlined"
              sx={{ mt: 1 }}
              onClick={() => void navigate('/helpdesk')}
            >
              Ir para Helpdesk
            </Button>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
