import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { StatusBadge, type BadgeVariant } from '@/components/StatusBadge';
import { FormField } from '@/components/FormField';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/stores/auth.store';
import { PolicyAcceptanceLogTable } from '@/components/PolicyAcceptanceLogTable';
import { ReusableDataGrid } from '@/components/ReusableDataGrid';
import type { GridColDef } from '@mui/x-data-grid';
import { fetchPolicies, createPolicy } from '@/api/policies.api';
import { PolicyStatus, type Policy, type CreatePolicyRequest } from '@/types/policies';

const statusLabels: Record<PolicyStatus, string> = {
  [PolicyStatus.DRAFT]: 'Rascunho',
  [PolicyStatus.PUBLISHED]: 'Publicada',
  [PolicyStatus.ARCHIVED]: 'Arquivada',
};

const statusVariants: Record<PolicyStatus, BadgeVariant> = {
  [PolicyStatus.DRAFT]: 'warning',
  [PolicyStatus.PUBLISHED]: 'success',
  [PolicyStatus.ARCHIVED]: 'neutral',
};

const policySchema = z.object({
  title: z.string().min(1, 'O título é obrigatório'),
  content: z.string().min(1, 'O conteúdo é obrigatório'),
  category: z.string().min(1, 'A categoria é obrigatória'),
  tagsInput: z.string().optional(),
});

type PolicyForm = z.infer<typeof policySchema>;

function tagsInputToArray(tagsInput?: string): string[] | undefined {
  const trimmed = tagsInput?.trim();
  if (!trimmed) return undefined;
  return trimmed
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function NewPolicyDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): React.JSX.Element {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const methods = useForm<PolicyForm>({
    resolver: zodResolver(policySchema),
    defaultValues: { title: '', content: '', category: '', tagsInput: '' },
  });

  const createMutation = useMutation({
    mutationFn: (values: PolicyForm) => {
      const payload: CreatePolicyRequest = {
        title: values.title,
        content: values.content,
        category: values.category,
        tags: tagsInputToArray(values.tagsInput),
      };
      return createPolicy(payload);
    },
    onSuccess: (policy: Policy) => {
      void queryClient.invalidateQueries({ queryKey: ['policies'] });
      onOpenChange(false);
      methods.reset();
      void navigate(`/policies/${policy.id}`);
    },
  });

  const onSubmit = (values: PolicyForm): void => {
    createMutation.mutate(values);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) methods.reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Política</DialogTitle>
        </DialogHeader>
        <FormProvider {...methods}>
          <form
            onSubmit={(event) => void methods.handleSubmit(onSubmit)(event)}
            className="space-y-4"
          >
            <FormField name="title" label="Título" />
            <FormField name="category" label="Categoria" placeholder="ex. RH, Segurança" />
            <div className="space-y-2">
              <Label htmlFor="content">Conteúdo</Label>
              <textarea
                id="content"
                rows={8}
                className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                {...methods.register('content')}
              />
              {methods.formState.errors.content && (
                <p className="text-xs text-red-600">{methods.formState.errors.content.message}</p>
              )}
            </div>
            <FormField
              name="tagsInput"
              label="Tags (separadas por vírgula, opcional)"
              placeholder="ex. férias, remoto"
            />
            {createMutation.isError && (
              <p className="text-sm text-red-600">Ocorreu um erro ao criar a política.</p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? <LoadingSpinner size={16} /> : 'Criar Política'}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

function PoliciesTable({
  status,
  canManage,
  onCreate,
}: {
  status?: PolicyStatus;
  canManage: boolean;
  onCreate: () => void;
}): React.JSX.Element {
  const navigate = useNavigate();
  const filters = { status };

  const { data: policies, isLoading } = useQuery({
    queryKey: ['policies', filters],
    queryFn: () => fetchPolicies(filters),
  });

  const categoryOptions = React.useMemo(
    () => [...new Set((policies ?? []).map((policy) => policy.category))].sort(),
    [policies],
  );

  const columns = React.useMemo<GridColDef<Policy>[]>(
    () => [
      { field: 'title', headerName: 'Título', flex: 1.4 },
      {
        field: 'category',
        headerName: 'Categoria',
        type: 'singleSelect',
        flex: 0.9,
        valueOptions: categoryOptions,
      },
      {
        field: 'tags',
        headerName: 'Tags',
        flex: 1,
        valueGetter: (_, row) => row.tags?.join(', ') ?? '-',
      },
      {
        field: 'status',
        headerName: 'Estado',
        type: 'singleSelect',
        flex: 0.8,
        valueOptions: Object.values(PolicyStatus),
        renderCell: (params) => (
          <StatusBadge
            label={statusLabels[params.row.status]}
            variant={statusVariants[params.row.status]}
          />
        ),
      },
      { field: 'version', headerName: 'Versão', type: 'number', width: 100 },
      {
        field: 'publishedAt',
        headerName: 'Publicada em',
        type: 'dateTime',
        flex: 1,
        valueGetter: (_, row) => (row.publishedAt ? new Date(row.publishedAt) : null),
      },
      {
        field: 'actions',
        headerName: '',
        sortable: false,
        filterable: false,
        width: 95,
        renderCell: (params) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void navigate(`/policies/${params.row.id}`);
            }}
          >
            Ver
          </Button>
        ),
      },
    ],
    [categoryOptions, navigate],
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {canManage && (
          <Button
            onClick={onCreate}
            variant="default"
            size="sm"
            sx={{
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              height: 30,
              px: 1.5,
              py: 0.5,
              fontSize: '0.8125rem',
              marginLeft: 'auto',
            }}
          >
            Nova Política
          </Button>
        )}
      </div>

      <ReusableDataGrid
        rows={policies ?? []}
        columns={columns}
        loading={isLoading}
        getRowId={(row) => row.id}
        autoHeight
        disableRowSelectionOnClick
        pageSizeOptions={[15, 30, 50]}
        initialState={{ pagination: { paginationModel: { pageSize: 12, page: 0 } } }}
        localeText={{ noRowsLabel: 'Nenhuma política encontrada.' }}
      />
    </div>
  );
}

export function PoliciesListPage(): React.JSX.Element {
  const permissions = useAuthStore((state) => state.permissions);
  const isAdmin = permissions.includes('admin:*') || permissions.some((p) => p.startsWith('admin'));
  const canManage = isAdmin || permissions.includes('manager');
  const [dialogOpen, setDialogOpen] = React.useState(false);

  return (
    <div>
      <PageHeader
        title="Políticas Internas"
        description="Repositório centralizado e pesquisável de políticas e conhecimento organizacional"
      />

      {canManage ? (
        <Tabs defaultValue="published">
          <TabsList>
            <TabsTrigger value="published">Publicadas</TabsTrigger>
            <TabsTrigger value="drafts">Rascunhos</TabsTrigger>
            <TabsTrigger value="archived">Arquivadas</TabsTrigger>
          </TabsList>
          <TabsContent value="published">
            <PoliciesTable
              status={PolicyStatus.PUBLISHED}
              canManage={canManage}
              onCreate={() => {
                setDialogOpen(true);
              }}
            />
          </TabsContent>
          <TabsContent value="drafts">
            <PoliciesTable
              status={PolicyStatus.DRAFT}
              canManage={canManage}
              onCreate={() => {
                setDialogOpen(true);
              }}
            />
          </TabsContent>
          <TabsContent value="archived">
            <PoliciesTable
              status={PolicyStatus.ARCHIVED}
              canManage={canManage}
              onCreate={() => {
                setDialogOpen(true);
              }}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <PoliciesTable canManage={false} onCreate={() => undefined} />
      )}

      {canManage && (
        <div className="mt-8">
          <PolicyAcceptanceLogTable />
        </div>
      )}

      <NewPolicyDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
