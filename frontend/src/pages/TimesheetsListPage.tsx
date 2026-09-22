import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { PageHeader } from '@/components/PageHeader';
import { DataTable, type Column } from '@/components/DataTable';
import { StatusBadge, type BadgeVariant } from '@/components/StatusBadge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fetchTimesheets } from '@/api/timesheets.api';
import { fetchEmployees } from '@/api/users.api';
import { useAuthStore } from '@/stores/auth.store';
import { TimesheetPeriod, TimesheetStatus, type TimesheetFilters } from '@/types/timesheets';
import { EmployeeStatus } from '@/types/users';

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

const MONTHS = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];

export function TimesheetsListPage(): React.JSX.Element {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isManagerUser = user !== null && isManager(user.roles);

  const currentYear = dayjs().year();
  const currentMonth = dayjs().month() + 1;
  const years = React.useMemo(() => {
    return Array.from({ length: 6 }, (_, index) => currentYear - index);
  }, [currentYear]);

  const [filters, setFilters] = React.useState<TimesheetFilters>({
    year: currentYear,
    month: currentMonth,
  });

  React.useEffect(() => {
    if (user !== null && !isManager(user.roles)) {
      setFilters((previous) => ({ ...previous, employeeId: user.id }));
    }
  }, [user]);

  const timesheetsQuery = useQuery({
    queryKey: ['timesheets', filters],
    queryFn: () => fetchTimesheets(filters),
  });

  const employeesQuery = useQuery({
    queryKey: ['employees', 'active'],
    queryFn: () => fetchEmployees({ status: EmployeeStatus.ACTIVE, limit: 100 }),
    enabled: isManagerUser,
  });

  const columns = React.useMemo<Column<TimesheetPeriod>[]>(
    () => [
      {
        key: 'period',
        header: 'Período',
        cell: (row: TimesheetPeriod): React.ReactNode => (
          <button
            type="button"
            className="text-brand-800 hover:underline"
            onClick={() => {
              void navigate(`/timesheets/${row.id}`);
            }}
          >
            {String(row.periodYear).padStart(4, '0')}/{String(row.periodMonth).padStart(2, '0')}
          </button>
        ),
      },
      {
        key: 'employee',
        header: 'Colaborador',
        cell: (row: TimesheetPeriod): React.ReactNode => {
          const name = `${row.employee?.firstName ?? ''} ${row.employee?.lastName ?? ''}`.trim();
          return name || '-';
        },
      },
      {
        key: 'status',
        header: 'Estado',
        cell: (row: TimesheetPeriod): React.ReactNode => {
          const props = getStatusProps(row.status);
          return <StatusBadge label={props.label} variant={props.variant} />;
        },
      },
      {
        key: 'workedHours',
        header: 'Horas trabalhadas',
        cell: (row: TimesheetPeriod): React.ReactNode => String(row.totalWorkedHours),
      },
      {
        key: 'plannedHours',
        header: 'Horas planeadas',
        cell: (row: TimesheetPeriod): React.ReactNode => String(row.totalPlannedHours),
      },
      {
        key: 'balance',
        header: 'Saldo',
        cell: (row: TimesheetPeriod): React.ReactNode => String(row.hoursBalance),
      },
    ],
    [navigate],
  );

  const employees = employeesQuery.data?.data ?? [];

  const handleExport = (): void => {
    // Placeholder para ação de exportação
  };

  if (user === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Folhas de Horas"
        description="Consulta e gestão das folhas de horas dos colaboradores"
        action={{
          label: 'Exportar',
          onClick: handleExport,
        }}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isManagerUser && (
          <Select
            value={filters.employeeId ?? ''}
            onValueChange={(value) => {
              setFilters((previous) => ({
                ...previous,
                employeeId: value === '' ? undefined : value,
              }));
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Colaborador" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              {employees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          value={filters.year !== undefined ? String(filters.year) : ''}
          onValueChange={(value) => {
            setFilters((previous) => ({
              ...previous,
              year: value === '' ? undefined : Number(value),
            }));
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            {years.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {String(year)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.month !== undefined ? String(filters.month) : ''}
          onValueChange={(value) => {
            setFilters((previous) => ({
              ...previous,
              month: value === '' ? undefined : Number(value),
            }));
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Mês" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            {MONTHS.map((month) => (
              <SelectItem key={month.value} value={String(month.value)}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status ?? ''}
          onValueChange={(value) => {
            setFilters((previous) => ({
              ...previous,
              status: value === '' ? undefined : (value as TimesheetStatus),
            }));
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            {Object.values(TimesheetStatus).map((status) => (
              <SelectItem key={status} value={status}>
                {getStatusProps(status).label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {timesheetsQuery.isLoading && (
        <div className="flex min-h-[30vh] items-center justify-center">
          <LoadingSpinner />
        </div>
      )}

      {timesheetsQuery.isError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Ocorreu um erro ao carregar as folhas de horas.
        </div>
      )}

      {!timesheetsQuery.isLoading && !timesheetsQuery.isError && (
        <DataTable
          data={timesheetsQuery.data ?? []}
          columns={columns}
          keyExtractor={(row) => row.id}
        />
      )}
    </div>
  );
}
