import * as React from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { Link as RouterLink } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  GraduationCap,
  ListTodo,
} from 'lucide-react';
import { fetchAbsences, fetchLeaveBalance } from '@/api/absences.api';
import { fetchMyContracts } from '@/api/contracts.api';
import { fetchHolidays } from '@/api/calendar.api';
import { fetchTimesheets } from '@/api/timesheets.api';
import { fetchTrainingRecords, fetchCourses } from '@/api/training.api';
import { fetchMyEmployee } from '@/api/users.api';
import { fetchMyTeams } from '@/api/teams.api';
import { fetchWorkflowInboxCount } from '@/api/workflow.api';
import { ProfilePersonalTab } from '@/components/ProfilePersonalTab';
import { ProfileDocumentsTab } from '@/components/ProfileDocumentsTab';
import { ProfileLaborEditor } from '@/components/ProfileLaborEditor';
import { ProfileContractsTab } from '@/components/ProfileContractsTab';
import { ProfileTrainingTab } from '@/components/ProfileTrainingTab';
import { useAuthStore } from '@/stores/auth.store';
import { AbsenceNewPage } from '@/pages/AbsenceNewPage';
import { AbsenceStatus, type AbsenceRequest } from '@/types/absences';
import type { EmployeeContract } from '@/types/contracts';
import { EmployeeStatus, type SelfEmployeeProfile } from '@/types/users';
import type { EmployeeTeamMembership } from '@/types/teams';
import type { Course, TrainingRecord } from '@/types/training';
import type { TimesheetPeriod } from '@/types/timesheets';

const weekdayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Não informado';
  return new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium' }).format(
    new Date(`${value.slice(0, 10)}T00:00:00`),
  );
}

function formatHours(value: number): string {
  return `${new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 1 }).format(value)} h`;
}

function employeeStatusLabel(status: EmployeeStatus): string {
  switch (status) {
    case EmployeeStatus.ACTIVE:
      return 'Ativo';
    case EmployeeStatus.INACTIVE:
      return 'Inativo';
    case EmployeeStatus.ON_LEAVE:
      return 'Em licença';
  }
}

function absenceLabel(absence: AbsenceRequest): string {
  return absence.absenceType?.name ?? 'Ausência';
}

function ProfileField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}): React.JSX.Element {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography color="text.secondary" variant="caption">
        {label}
      </Typography>
      <Typography sx={{ overflowWrap: 'anywhere' }} variant="body2">
        {value ?? 'Não informado'}
      </Typography>
    </Box>
  );
}

function SectionPaper({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}): React.JSX.Element {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, p: { xs: 2, sm: 2.5 } }}>
      <Stack direction="row" sx={{ mb: 2, alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {action}
      </Stack>
      {children}
    </Paper>
  );
}

function SummaryCard({
  title,
  value,
  detail,
  icon,
  href,
}: {
  title: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  href?: string;
}): React.JSX.Element {
  const content = (
    <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack
          direction="row"
          sx={{ mb: 1.5, alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Typography color="text.secondary" variant="body2">
            {title}
          </Typography>
          <Box sx={{ color: 'primary.main', display: 'flex' }}>{icon}</Box>
        </Stack>
        <Typography component="p" variant="h5" sx={{ fontWeight: 700 }}>
          {value}
        </Typography>
        <Typography color="text.secondary" variant="caption">
          {detail}
        </Typography>
      </CardContent>
    </Card>
  );

  return href ? (
    <Box component={RouterLink} to={href} sx={{ color: 'inherit', textDecoration: 'none' }}>
      {content}
    </Box>
  ) : (
    content
  );
}

function monthDays(month: Dayjs): Dayjs[] {
  const firstDay = month.startOf('month');
  const mondayOffset = (firstDay.day() + 6) % 7;
  const start = firstDay.subtract(mondayOffset, 'day');
  return Array.from({ length: 42 }, (_, index) => start.add(index, 'day'));
}

interface ProfileDayEvent {
  label: string;
  color: string;
}

function dayEvents(
  day: Dayjs,
  absences: AbsenceRequest[],
  holidays: { holidayDate: string; name: string }[],
): ProfileDayEvent[] {
  const date = day.format('YYYY-MM-DD');
  const holidayNames = holidays.filter((holiday) => holiday.holidayDate.slice(0, 10) === date);
  const absenceItems = absences.filter(
    (absence) => absence.startDate.slice(0, 10) <= date && absence.endDate.slice(0, 10) >= date,
  );
  return [
    ...holidayNames.map((holiday) => ({ label: holiday.name, color: 'error.main' })),
    ...absenceItems.map((absence) => ({
      label: absenceLabel(absence),
      color: absence.status === AbsenceStatus.PENDING ? 'warning.main' : 'success.main',
    })),
  ];
}

function ProfileCalendar({
  month,
  onMonthChange,
  absences,
  holidays,
}: {
  month: Dayjs;
  onMonthChange: (month: Dayjs) => void;
  absences: AbsenceRequest[];
  holidays: { holidayDate: string; name: string }[];
}): React.JSX.Element {
  const days = monthDays(month);

  return (
    <SectionPaper
      title="Calendário e ausências"
      action={
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <Button
            aria-label="Mês anterior"
            onClick={() => {
              onMonthChange(month.subtract(1, 'month'));
            }}
            size="small"
            sx={{ minWidth: 32, p: 0.5 }}
          >
            <ChevronLeft size={18} />
          </Button>
          <Typography
            sx={{ minWidth: 118, textAlign: 'center', textTransform: 'capitalize' }}
            variant="body2"
          >
            {month.format('MMMM YYYY')}
          </Typography>
          <Button
            aria-label="Próximo mês"
            onClick={() => {
              onMonthChange(month.add(1, 'month'));
            }}
            size="small"
            sx={{ minWidth: 32, p: 0.5 }}
          >
            <ChevronRight size={18} />
          </Button>
        </Stack>
      }
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 0.5 }}>
        {weekdayLabels.map((label) => (
          <Typography
            key={label}
            color="text.secondary"
            variant="caption"
            sx={{ textAlign: 'center', fontWeight: 700 }}
          >
            {label}
          </Typography>
        ))}
        {days.map((day) => {
          const events = dayEvents(day, absences, holidays);
          const isCurrentMonth = day.month() === month.month();
          return (
            <Tooltip
              key={day.format('YYYY-MM-DD')}
              title={events.map((event) => event.label).join(' · ')}
              disableHoverListener={events.length === 0}
            >
              <Box
                aria-label={`${day.format('DD/MM/YYYY')}${events.length ? `: ${events.map((event) => event.label).join(', ')}` : ''}`}
                sx={{
                  minHeight: { xs: 48, sm: 62 },
                  border: '1px solid',
                  borderColor: day.isSame(dayjs(), 'day') ? 'primary.main' : 'divider',
                  borderRadius: 1,
                  p: 0.5,
                  opacity: isCurrentMonth ? 1 : 0.4,
                  bgcolor: events.length ? 'action.hover' : 'background.paper',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ fontWeight: day.isSame(dayjs(), 'day') ? 700 : 400 }}
                >
                  {String(day.date())}
                </Typography>
                <Stack spacing={0.25} sx={{ mt: 0.25 }}>
                  {events.slice(0, 2).map((event, index) => (
                    <Box
                      key={`${event.label}-${String(index)}`}
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}
                    >
                      <Box
                        sx={{
                          width: 5,
                          height: 5,
                          flex: '0 0 auto',
                          borderRadius: '50%',
                          bgcolor: event.color,
                        }}
                      />
                      <Typography
                        noWrap
                        variant="caption"
                        sx={{ display: { xs: 'none', sm: 'block' } }}
                      >
                        {event.label}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Tooltip>
          );
        })}
      </Box>
      <Stack direction="row" spacing={2} sx={{ mt: 1.5, flexWrap: 'wrap' }}>
        {[
          { label: 'Feriado', color: 'error.main' },
          { label: 'Ausência aprovada', color: 'success.main' },
          { label: 'Pedido pendente', color: 'warning.main' },
        ].map((item) => (
          <Stack key={item.label} direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: item.color }} />
            <Typography color="text.secondary" variant="caption">
              {item.label}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </SectionPaper>
  );
}

function OverviewTab({
  employee,
  month,
  onMonthChange,
  timesheets,
  absences,
  holidays,
  trainingRecords,
  courses,
  pendingTaskCount,
  leaveRemaining,
  onRequestAbsence,
}: {
  employee: SelfEmployeeProfile;
  month: Dayjs;
  onMonthChange: (month: Dayjs) => void;
  timesheets: TimesheetPeriod[];
  absences: AbsenceRequest[];
  holidays: { holidayDate: string; name: string }[];
  trainingRecords: TrainingRecord[];
  courses: Course[];
  pendingTaskCount: number;
  leaveRemaining: number | null;
  onRequestAbsence: () => void;
}): React.JSX.Element {
  const period = timesheets[0];
  const completedCourseIds = new Set(trainingRecords.map((record) => record.courseId));
  const completedHours = trainingRecords.reduce((total, record) => {
    const course = record.course ?? courses.find((item) => item.id === record.courseId);
    return total + (course?.durationHours ?? 0);
  }, 0);
  const missingHours = courses
    .filter((course) => course.isMandatory && !completedCourseIds.has(course.id))
    .reduce((total, course) => total + (course.durationHours ?? 0), 0);
  const today = dayjs().format('YYYY-MM-DD');
  const upcomingAbsences = absences
    .filter(
      (absence) =>
        absence.endDate.slice(0, 10) >= today &&
        (absence.status === AbsenceStatus.APPROVED || absence.status === AbsenceStatus.PENDING),
    )
    .sort((left, right) => left.startDate.localeCompare(right.startDate))
    .slice(0, 4);
  const balance = period?.hoursBalance ?? 0;
  const leaveBalanceDetail =
    leaveRemaining === null
      ? 'Saldo de férias indisponível'
      : `${new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 1 }).format(leaveRemaining)} dias disponíveis`;

  return (
    <Stack spacing={2.5}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            xl: 'repeat(4, minmax(0, 1fr))',
          },
          gap: 1.5,
        }}
      >
        <SummaryCard
          title="Folha de horas"
          value={period ? formatHours(period.totalWorkedHours) : '—'}
          detail={
            period
              ? `${formatHours(period.totalPlannedHours)} planeadas · saldo ${formatHours(balance)}`
              : 'Sem registo neste mês'
          }
          icon={<Clock3 size={18} />}
          href="/timesheets"
        />
        <SummaryCard
          title="Ausências agendadas"
          value={String(upcomingAbsences.length)}
          detail={`${leaveBalanceDetail} · ${String(absences.filter((absence) => absence.status === AbsenceStatus.PENDING).length)} pedidos por aprovar`}
          icon={<CalendarDays size={18} />}
          href="/absences"
        />
        <SummaryCard
          title="Formação concluída"
          value={formatHours(completedHours)}
          detail={`${String(trainingRecords.length)} registos no histórico · ${formatHours(missingHours)} obrigatórias por concluir`}
          icon={<GraduationCap size={18} />}
          href="/training"
        />
        <SummaryCard
          title="Tarefas pendentes"
          value={String(pendingTaskCount)}
          detail="Na caixa de entrada"
          icon={<ListTodo size={18} />}
          href="/workflow/inbox"
        />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1.65fr) minmax(280px, 1fr)' },
          gap: 2,
        }}
      >
        <ProfileCalendar
          month={month}
          onMonthChange={onMonthChange}
          absences={absences}
          holidays={holidays}
        />
        <SectionPaper
          title="Próximas ausências"
          action={
            <Button onClick={onRequestAbsence} size="small" variant="outlined">
              Pedir ausência
            </Button>
          }
        >
          {upcomingAbsences.length === 0 ? (
            <Typography color="text.secondary" variant="body2">
              Não há ausências agendadas.
            </Typography>
          ) : (
            <Stack divider={<Divider flexItem />} spacing={1.25}>
              {upcomingAbsences.map((absence) => (
                <Stack
                  key={absence.id}
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography noWrap variant="body2" sx={{ fontWeight: 600 }}>
                      {absenceLabel(absence)}
                    </Typography>
                    <Typography color="text.secondary" variant="caption">
                      {formatDate(absence.startDate)} – {formatDate(absence.endDate)}
                    </Typography>
                  </Box>
                  <Chip
                    label={absence.status === AbsenceStatus.PENDING ? 'Pendente' : 'Aprovada'}
                    color={absence.status === AbsenceStatus.PENDING ? 'warning' : 'success'}
                    size="small"
                    variant="outlined"
                  />
                </Stack>
              ))}
            </Stack>
          )}
        </SectionPaper>
      </Box>

      <SectionPaper title="Resumo profissional">
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, minmax(0, 1fr))' },
            gap: 2,
          }}
        >
          <ProfileField label="Colaborador" value={employee.employeeNumber} />
          <ProfileField label="Cargo" value={employee.jobTitle?.name} />
          <ProfileField label="Departamento" value={employee.department?.name} />
          <ProfileField label="Data de início" value={formatDate(employee.employmentStartDate)} />
        </Box>
      </SectionPaper>
    </Stack>
  );
}

function LaborDetailsTab({
  employee,
  teams,
  contracts,
  canEdit,
}: {
  employee: SelfEmployeeProfile;
  teams: EmployeeTeamMembership[];
  contracts: EmployeeContract[];
  canEdit: boolean;
}): React.JSX.Element {
  const [editing, setEditing] = React.useState(false);
  const activeContract = contracts.find((contract) => contract.status === 'active');
  const managerName = employee.manager
    ? `${employee.manager.firstName} ${employee.manager.lastName}`
    : 'Não informado';

  if (editing) {
    return (
      <ProfileLaborEditor
        employee={employee}
        onCancel={() => {
          setEditing(false);
        }}
      />
    );
  }

  return (
    <Stack spacing={2.5}>
      <SectionPaper
        title="Vínculo laboral"
        action={
          canEdit ? (
            <Button
              onClick={() => {
                setEditing(true);
              }}
              size="small"
              variant="outlined"
            >
              Editar detalhes laborais
            </Button>
          ) : undefined
        }
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, minmax(0, 1fr))' },
            gap: 2.5,
          }}
        >
          <ProfileField label="Número de colaborador" value={employee.employeeNumber} />
          <ProfileField label="Estado" value={employeeStatusLabel(employee.status)} />
          <ProfileField label="Entidade empregadora" value={activeContract?.contractingEntity} />
          <ProfileField label="Data de início" value={formatDate(employee.employmentStartDate)} />
          <ProfileField label="Data de fim" value={formatDate(employee.employmentEndDate)} />
          <ProfileField label="Local de trabalho" value={employee.workLocation} />
          <ProfileField label="Cargo" value={employee.jobTitle?.name} />
          <ProfileField label="Departamento" value={employee.department?.name} />
          <ProfileField label="Gestor direto" value={managerName} />
        </Box>
      </SectionPaper>

      <SectionPaper title="Equipas">
        {teams.length === 0 ? (
          <Typography color="text.secondary" variant="body2">
            Não pertence a nenhuma equipa ativa.
          </Typography>
        ) : (
          <Stack divider={<Divider flexItem />} spacing={1.5}>
            {teams.map((membership) => (
              <Stack
                key={membership.id}
                direction={{ xs: 'column', sm: 'row' }}
                spacing={0.5}
                sx={{ justifyContent: 'space-between' }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {membership.team.name}
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  {membership.roleInTeam ?? membership.team.department?.name ?? 'Membro'}
                  {membership.team.leader
                    ? ` · Responsável: ${membership.team.leader.firstName} ${membership.team.leader.lastName}`
                    : ''}
                </Typography>
              </Stack>
            ))}
          </Stack>
        )}
      </SectionPaper>

      <SectionPaper title="Locais de trabalho">
        <Typography variant="body2">{employee.workLocation ?? 'Não informado'}</Typography>
      </SectionPaper>
    </Stack>
  );
}

export function ProfilePage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const permissions = useAuthStore((state) => state.permissions);
  const canEditEmployment =
    permissions.includes('admin:*') ||
    permissions.some((permission) => permission.startsWith('admin')) ||
    permissions.includes('manager');
  const [tab, setTab] = React.useState('overview');
  const [absenceDialogOpen, setAbsenceDialogOpen] = React.useState(false);
  const [month, setMonth] = React.useState(() => dayjs().startOf('month'));
  const employeeQuery = useQuery({ queryKey: ['my-employee-profile'], queryFn: fetchMyEmployee });
  const employeeId = employeeQuery.data?.id;
  const year = month.year();
  const calendarMonth = month.month() + 1;

  const timesheetsQuery = useQuery({
    queryKey: ['profile-timesheets', employeeId, year, calendarMonth],
    queryFn: () => fetchTimesheets({ employeeId: employeeId ?? '', year, month: calendarMonth }),
    enabled: Boolean(employeeId),
  });
  const absencesQuery = useQuery({
    queryKey: ['profile-absences', employeeId, year],
    queryFn: () => fetchAbsences({ employeeId: employeeId ?? '', year }),
    enabled: Boolean(employeeId),
  });
  const leaveBalanceQuery = useQuery({
    queryKey: ['profile-leave-balance', employeeId, year],
    queryFn: () => fetchLeaveBalance(employeeId ?? '', year),
    enabled: Boolean(employeeId),
  });
  const holidaysQuery = useQuery({
    queryKey: ['profile-holidays', employeeId, year],
    queryFn: () => fetchHolidays(year, 'PT'),
    enabled: Boolean(employeeId),
  });
  const trainingRecordsQuery = useQuery({
    queryKey: ['profile-training-records', employeeId],
    queryFn: () => fetchTrainingRecords(employeeId ?? ''),
    enabled: Boolean(employeeId),
  });
  const coursesQuery = useQuery({ queryKey: ['training-courses'], queryFn: fetchCourses });
  const teamsQuery = useQuery({
    queryKey: ['profile-teams', employeeId],
    queryFn: fetchMyTeams,
    enabled: Boolean(employeeId),
  });
  const contractsQuery = useQuery({
    queryKey: ['profile-contracts', employeeId],
    queryFn: fetchMyContracts,
    enabled: Boolean(employeeId),
  });
  const workflowCountQuery = useQuery({
    queryKey: ['workflow-count'],
    queryFn: () => fetchWorkflowInboxCount(),
    enabled: Boolean(employeeId),
  });

  if (employeeQuery.isLoading) {
    return (
      <Box sx={{ minHeight: 320, display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (employeeQuery.isError || !employeeQuery.data) {
    return <Alert severity="error">Não foi possível carregar o seu perfil de colaborador.</Alert>;
  }

  const employee = employeeQuery.data;
  const fullName = `${employee.firstName} ${employee.lastName}`;
  const initials = `${employee.firstName.charAt(0)}${employee.lastName.charAt(0)}`.toUpperCase();
  const timesheets = timesheetsQuery.data ?? [];
  const absences = absencesQuery.data ?? [];
  const leaveRemaining = (leaveBalanceQuery.data ?? []).reduce(
    (total, balance) => total + balance.remainingDays,
    0,
  );

  return (
    <Stack spacing={2.5}>
      <Paper variant="outlined" sx={{ borderRadius: 2, p: { xs: 2, sm: 2.5 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ alignItems: { sm: 'center' } }}
        >
          <Avatar
            src={employee.photoUrl ?? undefined}
            sx={{ width: 64, height: 64, bgcolor: 'primary.main' }}
          >
            {initials}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography component="h1" variant="h5" sx={{ fontWeight: 700 }}>
                {fullName}
              </Typography>
              <Chip
                label={employeeStatusLabel(employee.status)}
                size="small"
                color={employee.status === EmployeeStatus.ACTIVE ? 'success' : 'default'}
                variant="outlined"
              />
            </Stack>
            <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
              {[employee.jobTitle?.name, employee.department?.name].filter(Boolean).join(' · ') ||
                employee.email}
            </Typography>
          </Box>
          <Button
            onClick={() => {
              setAbsenceDialogOpen(true);
            }}
            variant="contained"
          >
            Pedir ausência
          </Button>
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Tabs
          value={tab}
          onChange={(_event, value: string) => {
            setTab(value);
          }}
          variant="scrollable"
          allowScrollButtonsMobile
          aria-label="Secções do perfil"
        >
          <Tab label="Visão geral" value="overview" />
          <Tab label="Detalhes laborais" value="labor" />
          <Tab label="Detalhes pessoais" value="personal" />
          <Tab label="Contratos" value="contracts" />
          <Tab label="Formações" value="training" />
          <Tab label="Documentos" value="documents" />
        </Tabs>
      </Paper>

      {tab === 'overview' && (
        <OverviewTab
          employee={employee}
          month={month}
          onMonthChange={setMonth}
          timesheets={timesheets}
          absences={absences}
          holidays={holidaysQuery.data?.filter((holiday) => holiday.global) ?? []}
          trainingRecords={trainingRecordsQuery.data ?? []}
          courses={coursesQuery.data ?? []}
          pendingTaskCount={workflowCountQuery.data?.count ?? 0}
          leaveRemaining={leaveBalanceQuery.isSuccess ? leaveRemaining : null}
          onRequestAbsence={() => {
            setAbsenceDialogOpen(true);
          }}
        />
      )}
      {tab === 'labor' && (
        <LaborDetailsTab
          employee={employee}
          teams={teamsQuery.data ?? []}
          contracts={contractsQuery.data ?? []}
          canEdit={canEditEmployment}
        />
      )}
      {tab === 'personal' && <ProfilePersonalTab employee={employee} />}
      {tab === 'contracts' && (
        <ProfileContractsTab contracts={contractsQuery.data ?? []} canEdit={canEditEmployment} />
      )}
      {tab === 'training' && <ProfileTrainingTab employeeId={employee.id} />}
      {tab === 'documents' && <ProfileDocumentsTab ownerId={employee.id} />}

      {absenceDialogOpen && (
        <AbsenceNewPage
          presentation="dialog"
          open
          onClose={() => {
            setAbsenceDialogOpen(false);
          }}
          onCompleted={() => {
            setAbsenceDialogOpen(false);
            void queryClient.invalidateQueries({ queryKey: ['profile-absences', employee.id] });
            void queryClient.invalidateQueries({
              queryKey: ['profile-leave-balance', employee.id],
            });
          }}
        />
      )}

      {(timesheetsQuery.isError || absencesQuery.isError || holidaysQuery.isError) &&
        tab === 'overview' && (
          <Alert severity="warning">
            Alguns indicadores não puderam ser carregados. As informações pessoais continuam
            disponíveis.
          </Alert>
        )}
    </Stack>
  );
}
