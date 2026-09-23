import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { StatusBadge, type BadgeVariant } from '@/components/StatusBadge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FormField } from '@/components/FormField';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/stores/auth.store';
import { fetchEmployees } from '@/api/users.api';
import { PolicyDocument } from '@/components/PolicyDocument';
import {
  fetchPolicy,
  fetchPolicyVersions,
  updatePolicy,
  publishPolicy,
  archivePolicy,
} from '@/api/policies.api';
import { PolicyStatus, type Policy, type UpdatePolicyRequest } from '@/types/policies';

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

const editSchema = z.object({
  title: z.string().min(1, 'O título é obrigatório'),
  content: z.string().min(1, 'O conteúdo é obrigatório'),
  category: z.string().min(1, 'A categoria é obrigatória'),
  tagsInput: z.string().optional(),
});

type EditForm = z.infer<typeof editSchema>;

function tagsInputToArray(tagsInput?: string): string[] | undefined {
  const trimmed = tagsInput?.trim();
  if (!trimmed) return undefined;
  return trimmed
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function EditPolicyDialog({
  open,
  onOpenChange,
  policy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy: Policy;
}): React.JSX.Element {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const methods = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    values: {
      title: policy.title,
      content: policy.content,
      category: policy.category,
      tagsInput: policy.tags?.join(', ') ?? '',
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: EditForm) => {
      const payload: UpdatePolicyRequest = {
        title: values.title,
        content: values.content,
        category: values.category,
        tags: tagsInputToArray(values.tagsInput),
      };
      return updatePolicy(policy.id, payload);
    },
    onSuccess: (newVersion: Policy) => {
      void queryClient.invalidateQueries({ queryKey: ['policies'] });
      onOpenChange(false);
      void navigate(`/policies/${newVersion.id}`);
    },
  });

  const onSubmit = (values: EditForm): void => {
    updateMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Política (cria nova versão)</DialogTitle>
        </DialogHeader>
        <FormProvider {...methods}>
          <form
            onSubmit={(event) => void methods.handleSubmit(onSubmit)(event)}
            className="space-y-4"
          >
            <FormField name="title" label="Título" />
            <FormField name="category" label="Categoria" />
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
            <FormField name="tagsInput" label="Tags (separadas por vírgula, opcional)" />
            {updateMutation.isError && (
              <p className="text-sm text-red-600">Ocorreu um erro ao guardar a nova versão.</p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <LoadingSpinner size={16} /> : 'Guardar Nova Versão'}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

export function PolicyDetailPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const permissions = useAuthStore((state) => state.permissions);
  const isAdmin = permissions.includes('admin:*') || permissions.some((p) => p.startsWith('admin'));
  const canManage = isAdmin || permissions.includes('manager');

  const [editOpen, setEditOpen] = React.useState(false);
  const [archiveOpen, setArchiveOpen] = React.useState(false);

  const {
    data: policy,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['policy', id],
    queryFn: () => fetchPolicy(id ?? ''),
    enabled: !!id,
  });

  const { data: versions } = useQuery({
    queryKey: ['policy-versions', id],
    queryFn: () => fetchPolicyVersions(id ?? ''),
    enabled: !!id && canManage,
  });

  const { data: employeesResponse } = useQuery({
    queryKey: ['policies-employees'],
    queryFn: () => fetchEmployees({ limit: 100 }),
    enabled: canManage,
  });

  const authorName = React.useMemo(() => {
    if (!policy?.authorId) return null;
    const employee = employeesResponse?.data.find((e) => e.userId === policy.authorId);
    return employee ? `${employee.firstName} ${employee.lastName}` : null;
  }, [employeesResponse, policy]);

  const publishMutation = useMutation({
    mutationFn: () => publishPolicy(id ?? ''),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['policy', id] });
      void queryClient.invalidateQueries({ queryKey: ['policies'] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () => archivePolicy(id ?? ''),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['policy', id] });
      void queryClient.invalidateQueries({ queryKey: ['policies'] });
      setArchiveOpen(false);
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  if (error || !policy) {
    return <p className="py-8 text-center text-muted-foreground">Política não encontrada.</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={policy.title}
        breadcrumb={[{ label: 'Políticas', href: '/policies' }, { label: policy.title }]}
        description="Documento interno"
      />

      <Card>
        <CardContent className="pt-6">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Categoria
              </dt>
              <dd className="mt-1 text-sm font-medium">{policy.category}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Estado
              </dt>
              <dd className="mt-1">
                <StatusBadge
                  label={statusLabels[policy.status]}
                  variant={statusVariants[policy.status]}
                />
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Versão
              </dt>
              <dd className="mt-1 text-sm font-medium">{policy.version}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Última edição
              </dt>
              <dd className="mt-1 text-sm text-muted-foreground">
                {new Date(policy.updatedAt).toLocaleDateString('pt-PT')}
              </dd>
            </div>
          </dl>
          {(policy.publishedAt ?? authorName) && (
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t pt-4 text-sm text-muted-foreground">
              {policy.publishedAt && (
                <span>Publicada em {new Date(policy.publishedAt).toLocaleDateString('pt-PT')}</span>
              )}
              {authorName && <span>Última edição por {authorName}</span>}
            </div>
          )}
        </CardContent>
      </Card>

      {policy.tags && policy.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Tags:</span>
          {policy.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {canManage && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setEditOpen(true);
            }}
          >
            Editar (nova versão)
          </Button>
          {isAdmin && policy.status === PolicyStatus.DRAFT && (
            <Button
              onClick={() => {
                publishMutation.mutate();
              }}
              disabled={publishMutation.isPending}
            >
              {publishMutation.isPending ? <LoadingSpinner size={16} /> : 'Publicar'}
            </Button>
          )}
          {isAdmin && policy.status === PolicyStatus.PUBLISHED && (
            <Button
              variant="destructive"
              onClick={() => {
                setArchiveOpen(true);
              }}
            >
              Arquivar
            </Button>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conteúdo da política</CardTitle>
        </CardHeader>
        <CardContent className="border-t pt-6">
          <div className="max-w-4xl text-sm leading-7">
            <PolicyDocument policy={policy} showHeader={false} />
          </div>
        </CardContent>
      </Card>

      {canManage && versions && versions.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico de Versões</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {versions.map((version) => (
                <li
                  key={version.id}
                  className="flex items-center justify-between rounded-md border p-3 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Versão {version.version}</span>
                    <StatusBadge
                      label={statusLabels[version.status]}
                      variant={statusVariants[version.status]}
                    />
                    {version.id === policy.id && (
                      <span className="text-xs text-muted-foreground">(atual)</span>
                    )}
                  </div>
                  {version.id !== policy.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        void navigate(`/policies/${version.id}`);
                      }}
                    >
                      Ver
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <EditPolicyDialog open={editOpen} onOpenChange={setEditOpen} policy={policy} />

      <ConfirmDialog
        open={archiveOpen}
        title="Arquivar Política"
        description={`Tem a certeza que pretende arquivar "${policy.title}"? A política deixará de estar visível na lista de publicadas.`}
        confirmLabel="Arquivar"
        onCancel={() => {
          setArchiveOpen(false);
        }}
        onConfirm={() => {
          archiveMutation.mutate();
        }}
        isLoading={archiveMutation.isPending}
      />
    </div>
  );
}
