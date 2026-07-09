import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge, type BadgeVariant } from '@/components/StatusBadge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  fetchTimesheet,
  updateTimesheetEntry,
  submitTimesheet,
  approveTimesheet,
  rejectTimesheet,
} from '@/api/timesheets.api';
import { fetchProjects } from '@/api/projects.api';
import { useAuthStore } from '@/stores/auth.store';
import { TimesheetEntry, TimesheetStatus } from '@/types/timesheets';
import { ProjectStatus } from '@/types/projects';
import type { CreateTimesheetEntryRequest } from '@/types/timesheets';

const MANAGER_ROLES = ['admin', 'manager', 'approver'];

function isManager(roles: string[]): boolean {
  return roles.some((role) => MANAGER_ROLES.includes(role));
}

function getStatusProps(status: TimesheetStatus): { label: string; variant: BadgeVariant } {
  switch (status) {
    case TimesheetStatus.IN_PROGRESS:
      return { label: 'Em preenchimento', variant: 'neutral' };
    case TimesheetStatus.SUBMITTED:
      return { label: 'Submetida', variant: 'info' };
    case TimesheetStatus.APPROVED:
      return { label: 'Aprovada', variant: 'success' };
    case TimesheetStatus.REJECTED:
      return { label: 'Rejeitada', variant: 'danger' };
  }
}

function formatDateLabel(date: dayjs.Dayjs): string {
  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const weekday = weekdays[date.day()] ?? '';
  return `${weekday} ${String(date.date()).padStart(2, '0')}/${String(date.month() + 1).padStart(2, '0')}`;
}

export function TimesheetDetailPage(): React.JSX.Element {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isManagerUser = user !== null && isManager(user.roles);

  const [rejectReason, setRejectReason] = React.useState('');

  const timesheetQuery = useQuery({
    queryKey: ['timesheet', id],
    queryFn: () => fetchTimesheet(id),
    enabled: id !== '',
  });

  const projectsQuery = useQuery({
    queryKey: ['projects', { status: ProjectStatus.ACTIVE }],
    queryFn: () => fetchProjects({ status: ProjectStatus.ACTIVE }),
  });

  const updateEntryMutation = useMutation({
    mutationFn: ({ entryId, data }: { entryId: string; data: CreateTimesheetEntryRequest }) =>
      updateTimesheetEntry(id, entryId, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['timesheet', id], updated);
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => submitTimesheet(id),
    onSuccess: (updated) => {
      queryClient.setQueryData(['timesheet', id], updated);
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => approveTimesheet(id, {}),
    onSuccess: (updated) => {
      queryClient.setQueryData(['timesheet', id], updated);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectTimesheet(id, { reason: rejectReason }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['timesheet', id], updated);
      setRejectReason('');
    },
  });

  const timesheet = timesheetQuery.data;
  const projects = projectsQuery.data ?? [];

  const daysInPeriod = React.useMemo(() => {
    if (timesheet === undefined) {
      return [];
    }
    const start = dayjs()
      .year(timesheet.periodYear)
      .month(timesheet.periodMonth - 1)
      .startOf('month');
    const count = start.daysInMonth();
    return Array.from({ length: count }, (_, index) => start.add(index, 'day'));
  }, [timesheet]);

  const findEntryForDate = React.useCallback(
    (date: dayjs.Dayjs): TimesheetEntry | undefined => {
      const dateStr = date.format('YYYY-MM-DD');
      return timesheet?.entries?.find((entry) => entry.entryDate === dateStr);
    },
    [timesheet],
  );

  const handleProjectChange = (entry: TimesheetEntry, value: string): void => {
    updateEntryMutation.mutate({
      entryId: entry.id,
      data: { projectId: value === '' ? undefined : value },
    });
  };

  const handleWorkedHoursChange = (entry: TimesheetEntry, value: string): void => {
    const hours = value === '' ? 0 : Number(value);
    if (Number.isNaN(hours)) {
      return;
    }
    updateEntryMutation.mutate({
      entryId: entry.id,
      data: { workedHours: hours },
    });
  };

  const handleNotesBlur = (entry: TimesheetEntry, value: string): void => {
    updateEntryMutation.mutate({
      entryId: entry.id,
      data: { notes: value === '' ? undefined : value },
    });
  };

  if (timesheetQuery.isLoading || projectsQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (timesheetQuery.isError || timesheet === undefined) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Ocorreu um erro ao carregar a folha de horas.
      </div>
    );
  }

  const isOwner = user !== null && user.id === timesheet.employeeId;
  const statusProps = getStatusProps(timesheet.status);
  const canSubmit = timesheet.status === TimesheetStatus.IN_PROGRESS && (isOwner || isManagerUser);
  const canReview = timesheet.status === TimesheetStatus.SUBMITTED && isManagerUser;

  return (
    <div>
      <PageHeader
        title={`Folha de Horas — ${String(timesheet.periodYear).padStart(4, '0')}/${String(timesheet.periodMonth).padStart(2, '0')}`}
        description={
          `${timesheet.employee?.firstName ?? ''} ${timesheet.employee?.lastName ?? ''}`.trim() ||
          'Colaborador'
        }
        breadcrumb={[
          { label: 'Folhas de Horas', href: '/timesheets' },
          {
            label: `${String(timesheet.periodYear).padStart(4, '0')}/${String(timesheet.periodMonth).padStart(2, '0')}`,
          },
        ]}
      />

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <StatusBadge label={statusProps.label} variant={statusProps.variant} />
        {canSubmit && (
          <Button
            onClick={() => {
              submitMutation.mutate();
            }}
            disabled={submitMutation.isPending}
          >
            Submeter
          </Button>
        )}
        {canReview && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => {
                approveMutation.mutate();
              }}
              disabled={approveMutation.isPending}
            >
              Aprovar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                rejectMutation.mutate();
              }}
              disabled={rejectMutation.isPending || rejectReason === ''}
            >
              Rejeitar
            </Button>
          </div>
        )}
      </div>

      {canReview && (
        <div className="mb-6 max-w-md">
          <Label htmlFor="rejectReason">Motivo da rejeição</Label>
          <Input
            id="rejectReason"
            value={rejectReason}
            onChange={(event) => {
              setRejectReason(event.target.value);
            }}
            placeholder="Indique o motivo da rejeição"
          />
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Horas planeadas</CardDescription>
            <CardTitle>{String(timesheet.totalPlannedHours)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Horas trabalhadas</CardDescription>
            <CardTitle>{String(timesheet.totalWorkedHours)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Horas extras</CardDescription>
            <CardTitle>{String(timesheet.totalOvertimeHours)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Saldo</CardDescription>
            <CardTitle>{String(timesheet.hoursBalance)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registo diário</CardTitle>
          <CardDescription>Edição das entradas do período</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Projeto</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Horas planeadas
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Horas trabalhadas
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Horas extras
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Notas</th>
                </tr>
              </thead>
              <tbody>
                {daysInPeriod.map((date) => {
                  const entry = findEntryForDate(date);
                  const hasDeficit = entry !== undefined && entry.workedHours < entry.plannedHours;
                  const isEditable = entry !== undefined && !entry.isLocked;

                  return (
                    <tr
                      key={date.format('YYYY-MM-DD')}
                      className={cn(
                        'border-b transition-colors hover:bg-muted/50',
                        hasDeficit && 'bg-amber-50',
                      )}
                    >
                      <td className="px-4 py-3">{formatDateLabel(date)}</td>
                      <td className="px-4 py-3">
                        {entry !== undefined ? (
                          <Select
                            value={entry.projectId ?? ''}
                            onValueChange={(value) => {
                              handleProjectChange(entry, value);
                            }}
                            disabled={!isEditable}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Selecionar projeto" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Sem projeto</SelectItem>
                              {projects.map((project) => (
                                <SelectItem key={project.id} value={project.id}>
                                  {project.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {entry !== undefined ? String(entry.plannedHours) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {entry !== undefined ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              step="0.5"
                              min="0"
                              className="w-24"
                              value={entry.workedHours}
                              onChange={(event) => {
                                handleWorkedHoursChange(entry, event.target.value);
                              }}
                              disabled={!isEditable}
                            />
                            {hasDeficit && <StatusBadge label="Abaixo" variant="warning" />}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {entry !== undefined ? String(entry.overtimeHours) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {entry !== undefined ? (
                          <Input
                            value={entry.notes ?? ''}
                            onBlur={(event) => {
                              handleNotesBlur(entry, event.target.value);
                            }}
                            disabled={!isEditable}
                            placeholder="Notas"
                          />
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6">
        <Button
          variant="outline"
          onClick={() => {
            void navigate('/timesheets');
          }}
        >
          Voltar
        </Button>
      </div>
    </div>
  );
}
