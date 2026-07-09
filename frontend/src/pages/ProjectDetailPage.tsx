import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { fetchProject, fetchAllocations } from '@/api/projects.api';
import { ProjectStatus, type ProjectAllocation } from '@/types/projects';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { StatusBadge, type BadgeVariant } from '@/components/StatusBadge';
import { DataTable, type Column } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) {
    return '-';
  }
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(amount);
}

function allocationTypeLabel(type: string): string {
  return type === 'hours' ? 'Horas' : 'Percentagem';
}

function employeeName(allocation: ProjectAllocation): string {
  if (allocation.employee) {
    return `${allocation.employee.firstName} ${allocation.employee.lastName}`;
  }
  return allocation.employeeId;
}

export function ProjectDetailPage(): React.JSX.Element {
  const { id = '' } = useParams<{ id: string }>();

  const {
    data: project,
    isLoading: isLoadingProject,
    isError: isProjectError,
    error: projectError,
  } = useQuery({
    queryKey: ['project', id],
    queryFn: () => fetchProject(id),
    enabled: id.length > 0,
  });

  const { data: allocations = [], isLoading: isLoadingAllocations } = useQuery({
    queryKey: ['project', id, 'allocations'],
    queryFn: () => fetchAllocations(id),
    enabled: id.length > 0,
  });

  const allocationColumns = React.useMemo<Column<ProjectAllocation>[]>(
    () => [
      {
        key: 'employee',
        header: 'Colaborador',
        cell: (row): React.ReactNode => employeeName(row),
      },
      {
        key: 'type',
        header: 'Tipo',
        cell: (row): React.ReactNode => allocationTypeLabel(row.allocationType),
      },
      {
        key: 'value',
        header: 'Valor',
        cell: (row): React.ReactNode => String(row.allocationValue),
      },
      {
        key: 'startDate',
        header: 'Início',
        cell: (row): React.ReactNode => formatDate(row.startDate),
      },
      {
        key: 'endDate',
        header: 'Fim',
        cell: (row): React.ReactNode => formatDate(row.endDate),
      },
      {
        key: 'role',
        header: 'Função',
        cell: (row): React.ReactNode => row.roleInProject ?? '-',
      },
    ],
    [],
  );

  const breadcrumbLabel = project?.name ?? 'Detalhe';

  if (isLoadingProject) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size={40} />
      </div>
    );
  }

  if (isProjectError || !project) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {projectError instanceof Error
          ? projectError.message
          : 'Ocorreu um erro ao carregar o projeto.'}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={project.name}
        breadcrumb={[{ label: 'Projetos', href: '/projects' }, { label: breadcrumbLabel }]}
      />

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="allocations">Alocações</TabsTrigger>
          <TabsTrigger value="timesheets">Timesheets</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>Informações do projeto</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Nome</dt>
                  <dd className="mt-1">{project.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Código</dt>
                  <dd className="mt-1">{project.code ?? '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Cliente</dt>
                  <dd className="mt-1">{project.client?.name ?? project.clientId}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Gestor</dt>
                  <dd className="mt-1">
                    {project.manager
                      ? `${project.manager.firstName} ${project.manager.lastName}`
                      : project.managerId}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Estado</dt>
                  <dd className="mt-1">
                    <StatusBadge
                      label={statusLabels[project.status]}
                      variant={statusVariants[project.status]}
                    />
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Datas</dt>
                  <dd className="mt-1">
                    {formatDate(project.startDate)} até {formatDate(project.endDate)}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-muted-foreground">Descrição</dt>
                  <dd className="mt-1 whitespace-pre-wrap">{project.description ?? '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Taxa horária</dt>
                  <dd className="mt-1">{formatCurrency(project.hourlyRate)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Orçamento</dt>
                  <dd className="mt-1">{formatCurrency(project.budget)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allocations">
          <Card>
            <CardHeader>
              <CardTitle>Alocações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Button asChild variant="outline">
                  <Link to={`/projects/${id}/allocations`}>Gerir alocações</Link>
                </Button>
              </div>
              {isLoadingAllocations ? (
                <div className="flex h-32 items-center justify-center">
                  <LoadingSpinner size={32} />
                </div>
              ) : (
                <DataTable
                  data={allocations}
                  columns={allocationColumns}
                  keyExtractor={(row) => row.id}
                  pageSize={5}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timesheets">
          <Card>
            <CardHeader>
              <CardTitle>Timesheets</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Funcionalidade em desenvolvimento.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Documentos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Funcionalidade em desenvolvimento.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial">
          <Card>
            <CardHeader>
              <CardTitle>Financeiro</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Funcionalidade em desenvolvimento.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
