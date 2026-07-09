import * as React from 'react';
import dayjs from 'dayjs';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { StatusBadge } from '@/components/StatusBadge';
import { DataTable, type Column } from '@/components/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth.store';
import { fetchAbsences } from '@/api/absences.api';
import { AbsenceStatus, type AbsenceRequest } from '@/types/absences';
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

function overlapsRange(absence: AbsenceRequest, start: dayjs.Dayjs, end: dayjs.Dayjs): boolean {
  const absenceStart = dayjs(absence.startDate).startOf('day');
  const absenceEnd = dayjs(absence.endDate).endOf('day');
  return !absenceEnd.isBefore(start, 'day') && !absenceStart.isAfter(end, 'day');
}

export function AbsencesTeamPage(): React.JSX.Element {
  const user = useAuthStore((state) => state.user);

  const [todayAbsences, setTodayAbsences] = React.useState<AbsenceRequest[]>([]);
  const [weekAbsences, setWeekAbsences] = React.useState<AbsenceRequest[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  const isManagerOrOwner =
    user?.roles.some((role) => ['manager', 'owner', 'admin'].includes(role)) ?? false;

  React.useEffect(() => {
    let cancelled = false;

    const loadTeamAbsences = async (): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const today = dayjs().startOf('day');
        const year = today.year();
        const data = await fetchAbsences({ year, status: AbsenceStatus.APPROVED });

        const weekEnd = today.add(6, 'day').endOf('day');

        const forToday = data.filter((absence) => overlapsRange(absence, today, today));
        const forWeek = data.filter((absence) => overlapsRange(absence, today, weekEnd));

        if (!cancelled) {
          setTodayAbsences(forToday);
          setWeekAbsences(forWeek);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar ausências da equipa');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadTeamAbsences();

    return (): void => {
      cancelled = true;
    };
  }, []);

  const columns: Column<AbsenceRequest>[] = [
    {
      key: 'employee',
      header: 'Colaborador',
      cell: (row: AbsenceRequest) => getEmployeeName(row),
    },
    {
      key: 'type',
      header: 'Tipo',
      cell: (row: AbsenceRequest) => row.absenceType?.name ?? '-',
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

  return (
    <div>
      <PageHeader
        title="Ausências da equipa"
        description="Colaboradores ausentes hoje e ao longo da semana"
      />

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {!isManagerOrOwner && !loading && (
        <p className="text-sm text-muted-foreground">
          Apenas gestores podem consultar esta página.
        </p>
      )}

      {loading && (
        <div className="flex h-40 items-center justify-center">
          <LoadingSpinner size={32} />
        </div>
      )}

      {!loading && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Hoje</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                data={todayAbsences}
                columns={columns}
                keyExtractor={(row: AbsenceRequest) => row.id}
                pageSize={10}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Esta semana</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                data={weekAbsences}
                columns={columns}
                keyExtractor={(row: AbsenceRequest) => row.id}
                pageSize={10}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
