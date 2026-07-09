import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dayjs from 'dayjs';
import { Trash2 } from 'lucide-react';
import {
  fetchProject,
  fetchAllocations,
  allocateEmployee,
  deleteAllocation,
} from '@/api/projects.api';
import { AllocationType, type ProjectAllocation } from '@/types/projects';
import { PageHeader } from '@/components/PageHeader';
import { DataTable, type Column } from '@/components/DataTable';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { FormField } from '@/components/FormField';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const allocationSchema = z.object({
  employeeId: z.string().min(1, 'O colaborador é obrigatório'),
  allocationType: z.nativeEnum(AllocationType),
  allocationValue: z
    .string()
    .min(1, 'O valor é obrigatório')
    .regex(/^\d+(\.\d{1,2})?$/, 'Valor inválido'),
  startDate: z.string().min(1, 'A data de início é obrigatória'),
  endDate: z.string().optional(),
  roleInProject: z.string().optional(),
});

type AllocationForm = z.infer<typeof allocationSchema>;

function formatDate(date: string | null | undefined): string {
  if (!date) {
    return '-';
  }
  return dayjs(date).format('DD/MM/YYYY');
}

function allocationTypeLabel(type: AllocationType): string {
  return type === AllocationType.HOURS ? 'Horas' : 'Percentagem';
}

function employeeName(allocation: ProjectAllocation): string {
  if (allocation.employee) {
    return `${allocation.employee.firstName} ${allocation.employee.lastName}`;
  }
  return allocation.employeeId;
}

function datesOverlap(
  startA: string,
  endA: string | null,
  startB: string,
  endB: string | null,
): boolean {
  const endAEffective = endA ?? '9999-12-31';
  const endBEffective = endB ?? '9999-12-31';
  return startA <= endBEffective && startB <= endAEffective;
}

function getOverlappingIds(allocations: ProjectAllocation[]): Set<string> {
  const ids = new Set<string>();
  for (let indexA = 0; indexA < allocations.length; indexA += 1) {
    const allocationA = allocations[indexA];
    if (!allocationA) {
      continue;
    }
    for (let indexB = indexA + 1; indexB < allocations.length; indexB += 1) {
      const allocationB = allocations[indexB];
      if (!allocationB) {
        continue;
      }
      if (
        datesOverlap(
          allocationA.startDate,
          allocationA.endDate ?? null,
          allocationB.startDate,
          allocationB.endDate ?? null,
        )
      ) {
        ids.add(allocationA.id);
        ids.add(allocationB.id);
      }
    }
  }
  return ids;
}

export function ProjectAllocationsPage(): React.JSX.Element {
  const { id = '' } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [allocationToDelete, setAllocationToDelete] = React.useState<string | null>(null);

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

  const {
    data: allocations = [],
    isLoading: isLoadingAllocations,
    isError: isAllocationsError,
    error: allocationsError,
  } = useQuery({
    queryKey: ['project', id, 'allocations'],
    queryFn: () => fetchAllocations(id),
    enabled: id.length > 0,
  });

  const overlappingIds = React.useMemo(() => getOverlappingIds(allocations), [allocations]);

  const form = useForm<AllocationForm>({
    resolver: zodResolver(allocationSchema),
    defaultValues: {
      employeeId: '',
      allocationType: AllocationType.PERCENTAGE,
      allocationValue: '',
      startDate: '',
      endDate: '',
      roleInProject: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: AllocationForm) =>
      allocateEmployee(id, {
        employeeId: data.employeeId,
        allocationType: data.allocationType,
        allocationValue: Number(data.allocationValue),
        startDate: data.startDate,
        endDate: data.endDate ?? undefined,
        roleInProject: data.roleInProject,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['project', id, 'allocations'] });
      form.reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (allocationId: string) => deleteAllocation(id, allocationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['project', id, 'allocations'] });
      setAllocationToDelete(null);
    },
  });

  const handleFormSubmit = form.handleSubmit((data: AllocationForm): void => {
    createMutation.mutate(data);
  });

  const handleConfirmDelete = (): void => {
    if (allocationToDelete) {
      deleteMutation.mutate(allocationToDelete);
    }
  };

  const columns = React.useMemo<Column<ProjectAllocation>[]>(
    () => [
      {
        key: 'employee',
        header: 'Colaborador',
        cell: (row): React.ReactNode => {
          const overlap = overlappingIds.has(row.id);
          return (
            <span className={cn('rounded px-2 py-1', overlap && 'bg-red-100 text-red-800')}>
              {employeeName(row)}
            </span>
          );
        },
      },
      {
        key: 'type',
        header: 'Tipo',
        cell: (row): React.ReactNode => {
          const overlap = overlappingIds.has(row.id);
          return (
            <span className={cn('rounded px-2 py-1', overlap && 'bg-red-100 text-red-800')}>
              {allocationTypeLabel(row.allocationType)}
            </span>
          );
        },
      },
      {
        key: 'value',
        header: 'Valor',
        cell: (row): React.ReactNode => {
          const overlap = overlappingIds.has(row.id);
          return (
            <span className={cn('rounded px-2 py-1', overlap && 'bg-red-100 text-red-800')}>
              {String(row.allocationValue)}
            </span>
          );
        },
      },
      {
        key: 'startDate',
        header: 'Início',
        cell: (row): React.ReactNode => {
          const overlap = overlappingIds.has(row.id);
          return (
            <span className={cn('rounded px-2 py-1', overlap && 'bg-red-100 text-red-800')}>
              {formatDate(row.startDate)}
            </span>
          );
        },
      },
      {
        key: 'endDate',
        header: 'Fim',
        cell: (row): React.ReactNode => {
          const overlap = overlappingIds.has(row.id);
          return (
            <span className={cn('rounded px-2 py-1', overlap && 'bg-red-100 text-red-800')}>
              {formatDate(row.endDate)}
            </span>
          );
        },
      },
      {
        key: 'role',
        header: 'Função',
        cell: (row): React.ReactNode => {
          const overlap = overlappingIds.has(row.id);
          return (
            <span className={cn('rounded px-2 py-1', overlap && 'bg-red-100 text-red-800')}>
              {row.roleInProject ?? '-'}
            </span>
          );
        },
      },
      {
        key: 'actions',
        header: '',
        cell: (row): React.ReactNode => (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setAllocationToDelete(row.id);
            }}
            aria-label="Remover alocação"
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        ),
      },
    ],
    [overlappingIds],
  );

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
        title="Alocações do projeto"
        description={project.name}
        breadcrumb={[
          { label: 'Projetos', href: '/projects' },
          { label: project.name, href: `/projects/${id}` },
          { label: 'Alocações' },
        ]}
      />

      {(isAllocationsError || createMutation.isError || deleteMutation.isError) && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {allocationsError instanceof Error
            ? allocationsError.message
            : createMutation.error instanceof Error
              ? createMutation.error.message
              : deleteMutation.error instanceof Error
                ? deleteMutation.error.message
                : 'Ocorreu um erro.'}
        </div>
      )}

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Alocações existentes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingAllocations ? (
              <div className="flex h-32 items-center justify-center">
                <LoadingSpinner size={32} />
              </div>
            ) : (
              <DataTable
                data={allocations}
                columns={columns}
                keyExtractor={(row) => row.id}
                pageSize={10}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Adicionar alocação</CardTitle>
          </CardHeader>
          <CardContent>
            <FormProvider {...form}>
              <form onSubmit={(event) => void handleFormSubmit(event)} className="space-y-4">
                <FormField name="employeeId" label="Colaborador" placeholder="ID do colaborador" />

                <div className="space-y-2">
                  <Label htmlFor="allocationType">Tipo</Label>
                  <Controller
                    name="allocationType"
                    control={form.control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                        }}
                      >
                        <SelectTrigger id="allocationType">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={AllocationType.PERCENTAGE}>
                            {allocationTypeLabel(AllocationType.PERCENTAGE)}
                          </SelectItem>
                          <SelectItem value={AllocationType.HOURS}>
                            {allocationTypeLabel(AllocationType.HOURS)}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {form.formState.errors.allocationType && (
                    <p className="text-xs text-red-600">
                      {form.formState.errors.allocationType.message}
                    </p>
                  )}
                </div>

                <FormField
                  name="allocationValue"
                  label="Valor"
                  type="number"
                  step="0.01"
                  placeholder="Ex: 50"
                />

                <FormField name="startDate" label="Início" type="date" />
                <FormField name="endDate" label="Fim" type="date" />
                <FormField name="roleInProject" label="Função" placeholder="Função no projeto" />

                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? <LoadingSpinner size={16} /> : 'Adicionar'}
                </Button>
              </form>
            </FormProvider>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6">
        <Button asChild variant="outline">
          <Link to={`/projects/${id}`}>Voltar ao projeto</Link>
        </Button>
      </div>

      <ConfirmDialog
        open={allocationToDelete !== null}
        title="Remover alocação"
        description="Tem a certeza que pretende remover esta alocação?"
        confirmLabel="Remover"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setAllocationToDelete(null);
        }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
