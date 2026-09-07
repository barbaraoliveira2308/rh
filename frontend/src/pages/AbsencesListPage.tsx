import * as React from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { StatusBadge } from '@/components/StatusBadge';
import { DataTable, type Column } from '@/components/DataTable';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import {
  fetchAbsenceCalendar,
  fetchAbsences,
  approveAbsence,
  rejectAbsence,
  cancelAbsence,
} from '@/api/absences.api';
import { AbsenceStatus, type AbsenceRequest, type AbsenceFilters } from '@/types/absences';
import type { BadgeVariant } from '@/components/StatusBadge';

const statusLabels: Record<AbsenceStatus, string> = {
  [AbsenceStatus.PENDING]: 'Pendente',
  [AbsenceStatus.APPROVED]: 'Aprovado',
  [AbsenceStatus.REJECTED]: 'Rejeitado',
  [AbsenceStatus.CANCELLED]: 'Cancelado',
};

const statusVariants: Record<AbsenceStatus, BadgeVariant> = {
  [AbsenceStatus.PENDING]: 'warning',
  [AbsenceStatus.APPROVED]: 'success',
  [AbsenceStatus.REJECTED]: 'danger',
  [AbsenceStatus.CANCELLED]: 'neutral',
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('pt-PT');
}

function getEmployeeName(absence: AbsenceRequest): string {
  if (absence.employee) {
    return `${absence.employee.firstName} ${absence.employee.lastName}`;
  }
  return absence.employeeId;
}

type StatusFilter = AbsenceStatus | 'all';

export function AbsencesListPage(): React.JSX.Element {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const today = new Date();
  const currentYear = today.getFullYear();

  const [year, setYear] = React.useState<number>(currentYear);
  const [month, setMonth] = React.useState<number>(today.getMonth());
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>(AbsenceStatus.PENDING);
  const [calendarAbsences, setCalendarAbsences] = React.useState<AbsenceRequest[]>([]);
  const [listAbsences, setListAbsences] = React.useState<AbsenceRequest[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [actionId, setActionId] = React.useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = React.useState<boolean>(false);
  const [rejectAbsenceId, setRejectAbsenceId] = React.useState<string | null>(null);
  const [rejectReason, setRejectReason] = React.useState<string>('');
  const [refresh, setRefresh] = React.useState<number>(0);

  const isManagerOrOwner =
    user?.roles.some((role) => ['manager', 'owner', 'admin'].includes(role)) ?? false;

  React.useEffect(() => {
    let cancelled = false;

    const loadData = async (): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const monthStr = dayjs().year(year).month(month).format('YYYY-MM');
        const filters: AbsenceFilters = {
          year,
          status: statusFilter === 'all' ? undefined : statusFilter,
        };

        const [calendarData, listData] = await Promise.all([
          fetchAbsenceCalendar(monthStr),
          fetchAbsences(filters),
        ]);

        if (!cancelled) {
          setCalendarAbsences(calendarData);
          setListAbsences(listData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar ausências');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return (): void => {
      cancelled = true;
    };
  }, [year, month, statusFilter, refresh]);

  const handlePreviousMonth = (): void => {
    const previous = dayjs().year(year).month(month).subtract(1, 'month');
    setYear(previous.year());
    setMonth(previous.month());
  };

  const handleNextMonth = (): void => {
    const next = dayjs().year(year).month(month).add(1, 'month');
    setYear(next.year());
    setMonth(next.month());
  };

  const handleApprove = async (id: string): Promise<void> => {
    setActionId(id);
    try {
      await approveAbsence(id, { comments: '' });
      setRefresh((prev) => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao aprovar pedido');
    } finally {
      setActionId(null);
    }
  };

  const openRejectDialog = (id: string): void => {
    setRejectAbsenceId(id);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const closeRejectDialog = (): void => {
    setRejectDialogOpen(false);
    setRejectAbsenceId(null);
    setRejectReason('');
  };

  const handleConfirmReject = async (): Promise<void> => {
    if (rejectAbsenceId === null || rejectReason.trim() === '') return;

    setActionId(rejectAbsenceId);
    try {
      await rejectAbsence(rejectAbsenceId, { reason: rejectReason.trim() });
      closeRejectDialog();
      setRefresh((prev) => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao rejeitar pedido');
    } finally {
      setActionId(null);
    }
  };

  const handleCancel = async (id: string): Promise<void> => {
    setActionId(id);
    try {
      await cancelAbsence(id);
      setRefresh((prev) => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cancelar pedido');
    } finally {
      setActionId(null);
    }
  };

  const monthDate = dayjs().year(year).month(month);
  const monthLabel = new Date(year, month).toLocaleDateString('pt-PT', {
    month: 'long',
    year: 'numeric',
  });
  const daysInMonth = monthDate.daysInMonth();
  const startDayOfWeek = monthDate.startOf('month').day();

  const calendarDays: (number | null)[] = [];
  for (let index = 0; index < startDayOfWeek; index++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const getAbsencesForDay = (day: number): AbsenceRequest[] => {
    const date = monthDate.date(day).startOf('day');
    return calendarAbsences.filter((absence) => {
      const start = dayjs(absence.startDate).startOf('day');
      const end = dayjs(absence.endDate).endOf('day');
      return !date.isBefore(start, 'day') && !date.isAfter(end, 'day');
    });
  };

  const renderWeekDayHeader = (label: string): React.ReactNode => (
    <div key={label} className="py-2 text-center text-xs font-medium text-muted-foreground">
      {label}
    </div>
  );

  const renderCalendarDay = (day: number | null, index: number): React.ReactNode => {
    if (day === null) {
      return <div key={`empty-${String(index)}`} className="min-h-[80px] border bg-muted/30" />;
    }

    const dayAbsences = getAbsencesForDay(day);

    return (
      <div
        key={`day-${String(day)}`}
        className="flex min-h-[80px] flex-col gap-1 border p-2 transition-colors hover:bg-muted/30"
      >
        <span className="text-sm font-medium">{day}</span>
        <div className="flex flex-1 flex-col gap-1 overflow-hidden">
          {dayAbsences.map((absence) => {
            const colorClass = absence.absenceType?.color ?? 'bg-blue-200 text-blue-900';
            return (
              <div
                key={absence.id}
                className={cn(
                  'truncate rounded px-1.5 py-0.5 text-xs',
                  colorClass.includes('bg-') ? colorClass : 'bg-blue-200 text-blue-900',
                )}
                title={`${getEmployeeName(absence)} - ${absence.absenceType?.name ?? ''}`}
              >
                {getEmployeeName(absence)}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const weekDayLabels: string[] = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const listColumns: Column<AbsenceRequest>[] = [
    {
      key: 'employee',
      header: 'Colaborador',
      cell: (row: AbsenceRequest) => getEmployeeName(row),
    },
    {
      key: 'type',
      header: 'Tipo',
      cell: (row: AbsenceRequest) => (
        <button
          type="button"
          className="text-brand-800 hover:underline"
          onClick={() => {
            void navigate(`/absences/${row.id}`);
          }}
        >
          {row.absenceType?.name ?? '-'}
        </button>
      ),
    },
    {
      key: 'startDate',
      header: 'De',
      cell: (row: AbsenceRequest) => formatDate(row.startDate),
    },
    {
      key: 'endDate',
      header: 'Até',
      cell: (row: AbsenceRequest) => formatDate(row.endDate),
    },
    {
      key: 'days',
      header: 'Dias',
      cell: (row: AbsenceRequest) => String(row.totalDays),
    },
    {
      key: 'status',
      header: 'Estado',
      cell: (row: AbsenceRequest) => (
        <StatusBadge label={statusLabels[row.status]} variant={statusVariants[row.status]} />
      ),
    },
  ];

  const showActions = isManagerOrOwner && statusFilter === AbsenceStatus.PENDING;

  if (showActions) {
    listColumns.push({
      key: 'actions',
      header: 'Ações',
      cell: (row: AbsenceRequest) => {
        const isLoading = actionId === row.id;
        return (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={isLoading}
              onClick={() => {
                void handleApprove(row.id);
              }}
            >
              Aprovar
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isLoading}
              onClick={() => {
                openRejectDialog(row.id);
              }}
            >
              Rejeitar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={isLoading}
              onClick={() => {
                void handleCancel(row.id);
              }}
            >
              Cancelar
            </Button>
          </div>
        );
      },
    });
  }

  const yearOptions: number[] = [];
  for (let y = currentYear - 2; y <= currentYear + 2; y++) {
    yearOptions.push(y);
  }

  return (
    <div>
      <PageHeader title="Ausências" description="Calendário mensal e pedidos de ausência" />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="space-y-2">
          <Label htmlFor="year-filter">Ano</Label>
          <select
            id="year-filter"
            value={year}
            onChange={(e) => {
              setYear(Number.parseInt(e.target.value, 10));
            }}
            className={cn(
              'flex h-10 w-32 rounded-md border border-border bg-background px-3 py-2 text-sm',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            )}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {String(y)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status-filter">Estado</Label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => {
              const value = e.target.value as StatusFilter;
              setStatusFilter(value);
            }}
            className={cn(
              'flex h-10 w-44 rounded-md border border-border bg-background px-3 py-2 text-sm',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            )}
          >
            {Object.values(AbsenceStatus).map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
            <option value="all">Todos</option>
          </select>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Calendário</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[140px] text-center text-sm font-medium capitalize">
              {monthLabel}
            </span>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && calendarAbsences.length === 0 && listAbsences.length === 0 ? (
            <div className="flex h-40 items-center justify-center">
              <LoadingSpinner size={32} />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {weekDayLabels.map(renderWeekDayHeader)}
              {calendarDays.map(renderCalendarDay)}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={listAbsences}
            columns={listColumns}
            keyExtractor={(row: AbsenceRequest) => row.id}
            pageSize={10}
          />
        </CardContent>
      </Card>

      <Dialog open={rejectDialogOpen} onOpenChange={closeRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar pedido</DialogTitle>
            <DialogDescription>Indique o motivo da rejeição.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="reject-reason" className="sr-only">
              Motivo
            </Label>
            <Input
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => {
                setRejectReason(e.target.value);
              }}
              placeholder="Motivo da rejeição"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeRejectDialog} disabled={actionId !== null}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={actionId !== null || rejectReason.trim() === ''}
              onClick={() => {
                void handleConfirmReject();
              }}
            >
              Rejeitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
