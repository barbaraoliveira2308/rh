import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
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
import { fetchDepartments, fetchEmployees } from '@/api/users.api';
import { Employee, EmployeeStatus, type EmployeeFilters } from '@/types/users';

const statusOptions = [
  { value: '', label: 'Todos' },
  { value: EmployeeStatus.ACTIVE, label: 'Ativo' },
  { value: EmployeeStatus.INACTIVE, label: 'Inativo' },
  { value: EmployeeStatus.ON_LEAVE, label: 'Em licença' },
];

function getStatusLabel(status: EmployeeStatus): string {
  switch (status) {
    case EmployeeStatus.ACTIVE:
      return 'Ativo';
    case EmployeeStatus.INACTIVE:
      return 'Inativo';
    case EmployeeStatus.ON_LEAVE:
      return 'Em licença';
    default:
      return status;
  }
}

function getStatusVariant(status: EmployeeStatus): BadgeVariant {
  switch (status) {
    case EmployeeStatus.ACTIVE:
      return 'success';
    case EmployeeStatus.INACTIVE:
      return 'neutral';
    case EmployeeStatus.ON_LEAVE:
      return 'warning';
    default:
      return 'default';
  }
}

export function UsersListPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [filters, setFilters] = React.useState<EmployeeFilters>({ limit: 100 });

  const { data, isLoading, error } = useQuery({
    queryKey: ['employees', filters],
    queryFn: () => fetchEmployees(filters),
  });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: fetchDepartments,
  });

  const updateFilter = <K extends keyof EmployeeFilters>(
    key: K,
    value: EmployeeFilters[K],
  ): void => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const columns: Column<Employee>[] = [
    {
      key: 'name',
      header: 'Nome',
      cell: (row) => `${row.firstName} ${row.lastName}`,
    },
    {
      key: 'email',
      header: 'Email',
      cell: (row) => row.email,
    },
    {
      key: 'department',
      header: 'Departamento',
      cell: (row) => row.department?.name ?? '-',
    },
    {
      key: 'jobTitle',
      header: 'Cargo',
      cell: (row) => row.jobTitle?.name ?? '-',
    },
    {
      key: 'status',
      header: 'Estado',
      cell: (row) => (
        <StatusBadge label={getStatusLabel(row.status)} variant={getStatusVariant(row.status)} />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Colaboradores"
        description="Gestão de colaboradores da organização"
        action={{
          label: 'Novo Colaborador',
          onClick: () => void navigate('/users/new'),
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      <div className="mb-4 flex flex-col gap-4 sm:flex-row">
        <div className="flex-1"></div>

        <div className="w-full sm:w-64 ">
          <Select
            value={filters.departmentId ?? ''}
            onValueChange={(value) => {
              updateFilter('departmentId', value || undefined);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Departamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              {departments?.map((department) => (
                <SelectItem key={department.id} value={department.id}>
                  {department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-48">
          <Select
            value={filters.status ?? ''}
            onValueChange={(value) => {
              updateFilter('status', value || undefined);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value || 'all'} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      )}

      {error && <p className="mb-4 text-sm text-red-600">Erro ao carregar colaboradores.</p>}

      {data && (
        <>
          <DataTable
            data={data.data}
            columns={columns}
            keyExtractor={(row) => row.id}
            pageSize={10}
          />
          <p className="mt-2 text-sm text-muted-foreground">Total: {String(data.total)}</p>
        </>
      )}
    </div>
  );
}
