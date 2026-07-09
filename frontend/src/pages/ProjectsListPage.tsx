import * as React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import dayjs from 'dayjs';
import { fetchProjects } from '@/api/projects.api';
import { ProjectStatus, type ProjectFilters } from '@/types/projects';
import { PageHeader } from '@/components/PageHeader';
import { DataTable, type Column } from '@/components/DataTable';
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

interface FilterState {
  status: ProjectStatus | 'all';
  clientId: string;
  managerId: string;
}

const statusLabels: Record<ProjectStatus, string> = {
  [ProjectStatus.DRAFT]: 'Rascunho',
  [ProjectStatus.ACTIVE]: 'Ativo',
  [ProjectStatus.CLOSED]: 'Encerrado',
};

const statusVariants: Record<ProjectStatus, BadgeVariant> = {
  [ProjectStatus.DRAFT]: 'warning',
  [ProjectStatus.ACTIVE]: 'success',
  [ProjectStatus.CLOSED]: 'neutral',
};

function formatDate(date: string | null | undefined): string {
  if (!date) {
    return '-';
  }
  return dayjs(date).format('DD/MM/YYYY');
}

export function ProjectsListPage(): React.JSX.Element {
  const [filters, setFilters] = React.useState<FilterState>({
    status: 'all',
    clientId: '',
    managerId: '',
  });

  const projectFilters: ProjectFilters = React.useMemo(() => {
    const result: ProjectFilters = {};
    if (filters.status !== 'all') {
      result.status = filters.status;
    }
    if (filters.clientId.trim()) {
      result.clientId = filters.clientId.trim();
    }
    if (filters.managerId.trim()) {
      result.managerId = filters.managerId.trim();
    }
    return result;
  }, [filters]);

  const {
    data: projects = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['projects', projectFilters],
    queryFn: () => fetchProjects(projectFilters),
  });

  const columns = React.useMemo<Column<(typeof projects)[number]>[]>(
    () => [
      {
        key: 'name',
        header: 'Nome',
        cell: (row): React.ReactNode => (
          <Link to={`/projects/${row.id}`} className="font-medium text-brand-800 hover:underline">
            {row.name}
          </Link>
        ),
      },
      {
        key: 'code',
        header: 'Código',
        cell: (row): React.ReactNode => row.code ?? '-',
      },
      {
        key: 'client',
        header: 'Cliente',
        cell: (row): React.ReactNode => row.client?.name ?? row.clientId,
      },
      {
        key: 'manager',
        header: 'Gestor',
        cell: (row): React.ReactNode =>
          row.manager ? `${row.manager.firstName} ${row.manager.lastName}` : row.managerId,
      },
      {
        key: 'status',
        header: 'Estado',
        cell: (row): React.ReactNode => (
          <StatusBadge label={statusLabels[row.status]} variant={statusVariants[row.status]} />
        ),
      },
      {
        key: 'startDate',
        header: 'Data início',
        cell: (row): React.ReactNode => formatDate(row.startDate),
      },
      {
        key: 'endDate',
        header: 'Data fim',
        cell: (row): React.ReactNode => formatDate(row.endDate),
      },
    ],
    [],
  );

  const handleExport = (): void => {
    // Placeholder para futura funcionalidade de exportação
  };

  return (
    <div>
      <PageHeader
        title="Projetos"
        description="Consulte e filtre os projetos da organização"
        action={{
          label: 'Exportar',
          onClick: handleExport,
          icon: <Download className="h-4 w-4" />,
        }}
      />

      <div className="mb-6 grid gap-4 rounded-lg border bg-card p-4 shadow-sm md:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="status">Estado</Label>
          <Select
            value={filters.status}
            onValueChange={(value) => {
              setFilters((prev) => ({ ...prev, status: value as ProjectStatus | 'all' }));
            }}
          >
            <SelectTrigger id="status">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value={ProjectStatus.DRAFT}>Rascunho</SelectItem>
              <SelectItem value={ProjectStatus.ACTIVE}>Ativo</SelectItem>
              <SelectItem value={ProjectStatus.CLOSED}>Encerrado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="clientId">ID cliente</Label>
          <Input
            id="clientId"
            placeholder="Filtrar por cliente"
            value={filters.clientId}
            onChange={(event) => {
              setFilters((prev) => ({ ...prev, clientId: event.target.value }));
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="managerId">ID gestor</Label>
          <Input
            id="managerId"
            placeholder="Filtrar por gestor"
            value={filters.managerId}
            onChange={(event) => {
              setFilters((prev) => ({ ...prev, managerId: event.target.value }));
            }}
          />
        </div>

        <div className="flex items-end">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setFilters({ status: 'all', clientId: '', managerId: '' });
            }}
          >
            Limpar filtros
          </Button>
        </div>
      </div>

      {isError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error instanceof Error ? error.message : 'Ocorreu um erro ao carregar os projetos.'}
        </div>
      )}

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size={40} />
        </div>
      ) : (
        <DataTable data={projects} columns={columns} keyExtractor={(row) => row.id} pageSize={10} />
      )}
    </div>
  );
}
