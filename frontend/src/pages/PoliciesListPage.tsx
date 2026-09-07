import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { StatusBadge, type BadgeVariant } from '@/components/StatusBadge';
import { DataTable, type Column } from '@/components/DataTable';
import { FormField } from '@/components/FormField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

function PoliciesTable({ status }: { status?: PolicyStatus }): React.JSX.Element {
  const navigate = useNavigate();
  const [q, setQ] = React.useState('');
  const [category, setCategory] = React.useState('');

  const filters = {
    q: q.trim() || undefined,
    category: category.trim() || undefined,
    status,
  };

  const { data: policies, isLoading } = useQuery({
    queryKey: ['policies', filters],
    queryFn: () => fetchPolicies(filters),
  });

  const columns: Column<Policy>[] = [
    { key: 'title', header: 'Título', cell: (row) => row.title },
    { key: 'category', header: 'Categoria', cell: (row) => row.category },
    {
      key: 'tags',
      header: 'Tags',
      cell: (row) => (row.tags && row.tags.length > 0 ? row.tags.join(', ') : '-'),
    },
    {
      key: 'status',
      header: 'Estado',
      cell: (row) => (
        <StatusBadge label={statusLabels[row.status]} variant={statusVariants[row.status]} />
      ),
    },
    { key: 'version', header: 'Versão', cell: (row) => String(row.version) },
    {
      key: 'publishedAt',
      header: 'Publicada em',
      cell: (row) =>
        row.publishedAt ? new Date(row.publishedAt).toLocaleDateString('pt-PT') : '-',
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            void navigate(`/policies/${row.id}`);
          }}
        >
          Ver
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <div className="relative w-[260px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
            }}
            placeholder="Pesquisar por palavra-chave"
            className="pl-9"
          />
        </div>
        <div className="w-[200px]">
          <Input
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
            }}
            placeholder="Filtrar por categoria"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size={32} />
        </div>
      ) : (policies ?? []).length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">Nenhuma política encontrada.</p>
      ) : (
        <DataTable
          data={policies ?? []}
          columns={columns}
          keyExtractor={(row) => row.id}
          pageSize={15}
        />
      )}
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

      {canManage && (
        <div className="mb-4 flex justify-end">
          <Button
            onClick={() => {
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Política
          </Button>
        </div>
      )}

      {canManage ? (
        <Tabs defaultValue="published">
          <TabsList>
            <TabsTrigger value="published">Publicadas</TabsTrigger>
            <TabsTrigger value="drafts">Rascunhos</TabsTrigger>
            <TabsTrigger value="archived">Arquivadas</TabsTrigger>
          </TabsList>
          <TabsContent value="published">
            <PoliciesTable status={PolicyStatus.PUBLISHED} />
          </TabsContent>
          <TabsContent value="drafts">
            <PoliciesTable status={PolicyStatus.DRAFT} />
          </TabsContent>
          <TabsContent value="archived">
            <PoliciesTable status={PolicyStatus.ARCHIVED} />
          </TabsContent>
        </Tabs>
      ) : (
        <PoliciesTable />
      )}

      <NewPolicyDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
