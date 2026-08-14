import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { StatusBadge, type BadgeVariant } from '@/components/StatusBadge';
import { DataTable, type Column } from '@/components/DataTable';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/stores/auth.store';
import { fetchEmployees } from '@/api/users.api';
import {
  fetchConsents,
  revokeConsent,
  recordConsent,
  fetchRequests,
  createDataRequest,
  completeRequest,
  rejectRequest,
  fetchRetentionPolicies,
  createRetentionPolicy,
  updateRetentionPolicy,
  fetchIncidents,
  reportIncident,
  updateIncident,
  fetchComplianceReport,
} from '@/api/gdpr.api';
import {
  LegalBasis,
  DataSubjectRequestType,
  DataSubjectRequestStatus,
  SecurityIncidentSeverity,
  SecurityIncidentStatus,
  RetentionAction,
  LEGAL_BASIS_LABELS,
  REQUEST_TYPE_LABELS,
  type ConsentRecord,
  type DataSubjectRequest,
  type RetentionPolicy,
  type SecurityIncident,
} from '@/types/gdpr';

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString('pt-PT') : '—';
}

const selectClass =
  'flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';
const textareaClass =
  'flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export function GdprPage(): React.JSX.Element {
  const permissions = useAuthStore((state) => state.permissions);
  const isAdmin = permissions.includes('admin:*') || permissions.some((p) => p.startsWith('admin'));

  return (
    <div>
      <PageHeader
        title="Privacidade & GDPR"
        description="Consentimentos, pedidos de titulares, retenção e incidentes de segurança"
      />

      <Tabs defaultValue="my-data">
        <TabsList>
          <TabsTrigger value="my-data">Os Meus Dados</TabsTrigger>
          {isAdmin && <TabsTrigger value="consents">Consentimentos</TabsTrigger>}
          {isAdmin && <TabsTrigger value="requests">Pedidos de Titulares</TabsTrigger>}
          {isAdmin && <TabsTrigger value="retention">Retenção</TabsTrigger>}
          {isAdmin && <TabsTrigger value="incidents">Incidentes</TabsTrigger>}
          {isAdmin && <TabsTrigger value="compliance">Conformidade</TabsTrigger>}
        </TabsList>

        <TabsContent value="my-data">
          <MyDataTab />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="consents">
            <ConsentsTab />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="requests">
            <RequestsTab />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="retention">
            <RetentionTab />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="incidents">
            <IncidentsTab />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="compliance">
            <ComplianceTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// ---------- Os Meus Dados ----------

const requestStatusLabels: Record<DataSubjectRequestStatus, string> = {
  [DataSubjectRequestStatus.PENDING]: 'Pendente',
  [DataSubjectRequestStatus.IN_PROGRESS]: 'Em curso',
  [DataSubjectRequestStatus.COMPLETED]: 'Concluído',
  [DataSubjectRequestStatus.REJECTED]: 'Rejeitado',
};

const requestStatusVariants: Record<DataSubjectRequestStatus, BadgeVariant> = {
  [DataSubjectRequestStatus.PENDING]: 'warning',
  [DataSubjectRequestStatus.IN_PROGRESS]: 'info',
  [DataSubjectRequestStatus.COMPLETED]: 'success',
  [DataSubjectRequestStatus.REJECTED]: 'danger',
};

function MyDataTab(): React.JSX.Element {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [lastResult, setLastResult] = React.useState<DataSubjectRequest | null>(null);
  const [payloadVisible, setPayloadVisible] = React.useState(false);

  const { data: consents, isLoading } = useQuery({
    queryKey: ['gdpr-my-consents', user?.id],
    queryFn: () => fetchConsents(user?.id ?? ''),
    enabled: !!user?.id,
  });

  const revokeMutation = useMutation({
    mutationFn: (purpose: string) =>
      revokeConsent(user?.id ?? '', { subjectId: user?.id ?? '', purpose }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['gdpr-my-consents', user?.id] });
    },
  });

  const consentColumns: Column<ConsentRecord>[] = [
    { key: 'purpose', header: 'Finalidade', cell: (row) => row.purpose },
    {
      key: 'legalBasis',
      header: 'Base Legal',
      cell: (row) => LEGAL_BASIS_LABELS[row.legalBasis],
    },
    { key: 'grantedAt', header: 'Concedido em', cell: (row) => formatDate(row.grantedAt) },
    {
      key: 'isActive',
      header: 'Estado',
      cell: (row) => (
        <StatusBadge
          label={row.isActive ? 'Ativo' : 'Revogado'}
          variant={row.isActive ? 'success' : 'neutral'}
        />
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (row) =>
        row.isActive ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              revokeMutation.mutate(row.purpose);
            }}
            disabled={revokeMutation.isPending}
          >
            Revogar
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Os Meus Consentimentos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSpinner />
          ) : (
            <DataTable
              data={consents ?? []}
              columns={consentColumns}
              keyExtractor={(row) => row.id}
              pageSize={10}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Pedidos de Titular</CardTitle>
          <Button
            size="sm"
            onClick={() => {
              setLastResult(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Submeter Pedido
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Pode submeter um pedido de acesso, retificação, apagamento, limitação, portabilidade ou
            oposição sobre os seus dados pessoais. Pedidos de acesso, portabilidade e apagamento são
            processados de imediato; os restantes são analisados pelo administrador.
          </p>
          {lastResult && (
            <div className="mt-4 rounded-md border p-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {REQUEST_TYPE_LABELS[lastResult.requestType]}
                </span>
                <StatusBadge
                  label={requestStatusLabels[lastResult.status]}
                  variant={requestStatusVariants[lastResult.status]}
                />
              </div>
              {lastResult.responseNotes && (
                <p className="mt-2 text-sm text-muted-foreground">{lastResult.responseNotes}</p>
              )}
              {lastResult.responsePayload && (
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setPayloadVisible((prev) => !prev);
                    }}
                  >
                    {payloadVisible ? 'Ocultar dados' : 'Ver dados exportados'}
                  </Button>
                  {payloadVisible && (
                    <pre className="mt-2 max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs">
                      {JSON.stringify(lastResult.responsePayload, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <NewRequestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        subjectId={user?.id ?? ''}
        onCreated={(request) => {
          setLastResult(request);
          setPayloadVisible(false);
        }}
      />
    </div>
  );
}

const requestSchema = z.object({
  requestType: z.nativeEnum(DataSubjectRequestType),
  notes: z.string().optional(),
});

type RequestForm = z.infer<typeof requestSchema>;

function NewRequestDialog({
  open,
  onOpenChange,
  subjectId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectId: string;
  onCreated: (request: DataSubjectRequest) => void;
}): React.JSX.Element {
  const methods = useForm<RequestForm>({
    resolver: zodResolver(requestSchema),
    defaultValues: { requestType: DataSubjectRequestType.ACCESS, notes: '' },
  });

  const createMutation = useMutation({
    mutationFn: (values: RequestForm) =>
      createDataRequest({ subjectId, requestType: values.requestType, notes: values.notes }),
    onSuccess: (request) => {
      onCreated(request);
      onOpenChange(false);
      methods.reset();
    },
  });

  const onSubmit = (values: RequestForm): void => {
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
          <DialogTitle>Submeter Pedido de Titular</DialogTitle>
        </DialogHeader>
        <FormProvider {...methods}>
          <form
            onSubmit={(event) => void methods.handleSubmit(onSubmit)(event)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="requestType">Tipo de Pedido</Label>
              <select id="requestType" {...methods.register('requestType')} className={selectClass}>
                {Object.values(DataSubjectRequestType).map((type) => (
                  <option key={type} value={type}>
                    {REQUEST_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <textarea
                id="notes"
                rows={3}
                className={textareaClass}
                {...methods.register('notes')}
              />
            </div>
            {createMutation.isError && (
              <p className="text-sm text-red-600">Ocorreu um erro ao submeter o pedido.</p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? <LoadingSpinner size={16} /> : 'Submeter'}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Consentimentos (admin) ----------

function ConsentsTab(): React.JSX.Element {
  const queryClient = useQueryClient();
  const [employeeId, setEmployeeId] = React.useState('');
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const { data: employees } = useQuery({
    queryKey: ['gdpr-employees'],
    queryFn: () => fetchEmployees({ limit: 100 }),
  });

  const { data: consents, isLoading } = useQuery({
    queryKey: ['gdpr-consents', employeeId],
    queryFn: () => fetchConsents(employeeId),
    enabled: employeeId !== '',
  });

  const revokeMutation = useMutation({
    mutationFn: (purpose: string) => revokeConsent(employeeId, { subjectId: employeeId, purpose }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['gdpr-consents', employeeId] });
    },
  });

  const columns: Column<ConsentRecord>[] = [
    { key: 'purpose', header: 'Finalidade', cell: (row) => row.purpose },
    {
      key: 'legalBasis',
      header: 'Base Legal',
      cell: (row) => LEGAL_BASIS_LABELS[row.legalBasis],
    },
    { key: 'grantedAt', header: 'Concedido em', cell: (row) => formatDate(row.grantedAt) },
    { key: 'revokedAt', header: 'Revogado em', cell: (row) => formatDate(row.revokedAt) },
    {
      key: 'isActive',
      header: 'Estado',
      cell: (row) => (
        <StatusBadge
          label={row.isActive ? 'Ativo' : 'Revogado'}
          variant={row.isActive ? 'success' : 'neutral'}
        />
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (row) =>
        row.isActive ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              revokeMutation.mutate(row.purpose);
            }}
            disabled={revokeMutation.isPending}
          >
            Revogar
          </Button>
        ) : null,
    },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Consentimentos por Colaborador</CardTitle>
        <Button
          size="sm"
          onClick={() => {
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Registar Consentimento
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="w-[280px] space-y-2">
          <Label>Colaborador</Label>
          <select
            value={employeeId}
            onChange={(e) => {
              setEmployeeId(e.target.value);
            }}
            className={selectClass}
          >
            <option value="">Selecionar…</option>
            {(employees?.data ?? []).map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.firstName} {employee.lastName}
              </option>
            ))}
          </select>
        </div>

        {employeeId === '' ? (
          <p className="py-8 text-center text-muted-foreground">
            Selecione um colaborador para ver os seus consentimentos.
          </p>
        ) : isLoading ? (
          <LoadingSpinner />
        ) : (
          <DataTable
            data={consents ?? []}
            columns={columns}
            keyExtractor={(row) => row.id}
            pageSize={10}
          />
        )}
      </CardContent>

      <NewConsentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        employees={employees?.data ?? []}
        defaultEmployeeId={employeeId}
      />
    </Card>
  );
}

const consentSchema = z.object({
  subjectId: z.string().min(1, 'Selecione um colaborador'),
  purpose: z.string().min(1, 'A finalidade é obrigatória'),
  legalBasis: z.nativeEnum(LegalBasis),
  version: z.string().optional(),
});

type ConsentForm = z.infer<typeof consentSchema>;

function NewConsentDialog({
  open,
  onOpenChange,
  employees,
  defaultEmployeeId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: { id: string; firstName: string; lastName: string }[];
  defaultEmployeeId: string;
}): React.JSX.Element {
  const queryClient = useQueryClient();

  const methods = useForm<ConsentForm>({
    resolver: zodResolver(consentSchema),
    defaultValues: {
      subjectId: defaultEmployeeId,
      purpose: '',
      legalBasis: LegalBasis.CONSENT,
      version: '',
    },
  });

  React.useEffect(() => {
    methods.setValue('subjectId', defaultEmployeeId);
  }, [defaultEmployeeId, methods]);

  const createMutation = useMutation({
    mutationFn: (values: ConsentForm) =>
      recordConsent({
        subjectId: values.subjectId,
        purpose: values.purpose,
        legalBasis: values.legalBasis,
        version: values.version,
      }),
    onSuccess: (_consent, values) => {
      void queryClient.invalidateQueries({ queryKey: ['gdpr-consents', values.subjectId] });
      onOpenChange(false);
      methods.reset();
    },
  });

  const onSubmit = (values: ConsentForm): void => {
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
          <DialogTitle>Registar Consentimento</DialogTitle>
        </DialogHeader>
        <FormProvider {...methods}>
          <form
            onSubmit={(event) => void methods.handleSubmit(onSubmit)(event)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="subjectId">Colaborador</Label>
              <select id="subjectId" {...methods.register('subjectId')} className={selectClass}>
                <option value="">Selecionar…</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName}
                  </option>
                ))}
              </select>
              {methods.formState.errors.subjectId && (
                <p className="text-xs text-red-600">{methods.formState.errors.subjectId.message}</p>
              )}
            </div>
            <FormField name="purpose" label="Finalidade" placeholder="Ex.: Marketing direto" />
            <div className="space-y-2">
              <Label htmlFor="legalBasis">Base Legal</Label>
              <select id="legalBasis" {...methods.register('legalBasis')} className={selectClass}>
                {Object.values(LegalBasis).map((basis) => (
                  <option key={basis} value={basis}>
                    {LEGAL_BASIS_LABELS[basis]}
                  </option>
                ))}
              </select>
            </div>
            <FormField name="version" label="Versão (opcional)" />
            {createMutation.isError && (
              <p className="text-sm text-red-600">
                Ocorreu um erro ao registar o consentimento (pode já existir um ativo para esta
                finalidade).
              </p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? <LoadingSpinner size={16} /> : 'Registar'}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Pedidos de Titulares (admin) ----------

function RequestsTab(): React.JSX.Element {
  const queryClient = useQueryClient();
  const [actionTarget, setActionTarget] = React.useState<{
    request: DataSubjectRequest;
    kind: 'complete' | 'reject';
  } | null>(null);
  const [notes, setNotes] = React.useState('');

  const { data: requests, isLoading } = useQuery({
    queryKey: ['gdpr-requests'],
    queryFn: fetchRequests,
  });

  const actionMutation = useMutation({
    mutationFn: () => {
      if (!actionTarget) {
        return Promise.reject(new Error('Sem pedido selecionado'));
      }
      return actionTarget.kind === 'complete'
        ? completeRequest(actionTarget.request.id, notes || undefined)
        : rejectRequest(actionTarget.request.id, notes);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['gdpr-requests'] });
      setActionTarget(null);
      setNotes('');
    },
  });

  const columns: Column<DataSubjectRequest>[] = [
    {
      key: 'subject',
      header: 'Colaborador',
      cell: (row) =>
        row.subject ? `${row.subject.firstName} ${row.subject.lastName}` : row.subjectId,
    },
    { key: 'requestType', header: 'Tipo', cell: (row) => REQUEST_TYPE_LABELS[row.requestType] },
    {
      key: 'status',
      header: 'Estado',
      cell: (row) => (
        <StatusBadge
          label={requestStatusLabels[row.status]}
          variant={requestStatusVariants[row.status]}
        />
      ),
    },
    { key: 'requestedAt', header: 'Pedido em', cell: (row) => formatDate(row.requestedAt) },
    {
      key: 'deadline',
      header: 'Prazo',
      cell: (row): React.JSX.Element => {
        const overdue =
          row.status === DataSubjectRequestStatus.PENDING &&
          row.deadline &&
          new Date(row.deadline) < new Date();
        return (
          <span className={overdue ? 'font-medium text-red-600' : undefined}>
            {formatDate(row.deadline)}
          </span>
        );
      },
    },
    { key: 'responseNotes', header: 'Notas', cell: (row) => row.responseNotes ?? '—' },
    {
      key: 'actions',
      header: '',
      cell: (row) =>
        row.status === DataSubjectRequestStatus.PENDING ||
        row.status === DataSubjectRequestStatus.IN_PROGRESS ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setNotes('');
                setActionTarget({ request: row, kind: 'complete' });
              }}
            >
              Completar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                setNotes('');
                setActionTarget({ request: row, kind: 'reject' });
              }}
            >
              Rejeitar
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pedidos de Titulares</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <DataTable
            data={requests ?? []}
            columns={columns}
            keyExtractor={(row) => row.id}
            pageSize={15}
          />
        )}
      </CardContent>

      <Dialog
        open={actionTarget !== null}
        onOpenChange={(next) => {
          if (!next) setActionTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionTarget?.kind === 'complete' ? 'Completar Pedido' : 'Rejeitar Pedido'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="action-notes">
                Notas{actionTarget?.kind === 'reject' ? ' (obrigatório)' : ' (opcional)'}
              </Label>
              <textarea
                id="action-notes"
                rows={3}
                className={textareaClass}
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                }}
              />
            </div>
            {actionMutation.isError && (
              <p className="text-sm text-red-600">Ocorreu um erro ao processar o pedido.</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant={actionTarget?.kind === 'reject' ? 'destructive' : 'default'}
              disabled={
                actionMutation.isPending || (actionTarget?.kind === 'reject' && notes.trim() === '')
              }
              onClick={() => {
                actionMutation.mutate();
              }}
            >
              {actionMutation.isPending ? (
                <LoadingSpinner size={16} />
              ) : actionTarget?.kind === 'complete' ? (
                'Completar'
              ) : (
                'Rejeitar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ---------- Retenção (admin) ----------

const retentionActionLabels: Record<RetentionAction, string> = {
  [RetentionAction.DELETE]: 'Eliminar',
  [RetentionAction.ANONYMIZE]: 'Anonimizar',
};

function RetentionTab(): React.JSX.Element {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const { data: policies, isLoading } = useQuery({
    queryKey: ['gdpr-retention-policies'],
    queryFn: fetchRetentionPolicies,
  });

  const toggleMutation = useMutation({
    mutationFn: (policy: RetentionPolicy) => updateRetentionPolicy(policy.id, !policy.isActive),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['gdpr-retention-policies'] });
    },
  });

  const columns: Column<RetentionPolicy>[] = [
    { key: 'dataCategory', header: 'Categoria de Dados', cell: (row) => row.dataCategory },
    { key: 'retentionYears', header: 'Anos', cell: (row) => String(row.retentionYears) },
    {
      key: 'actionAfterRetention',
      header: 'Ação após retenção',
      cell: (row) => retentionActionLabels[row.actionAfterRetention],
    },
    { key: 'legalReference', header: 'Referência Legal', cell: (row) => row.legalReference ?? '—' },
    {
      key: 'isActive',
      header: 'Estado',
      cell: (row) => (
        <StatusBadge
          label={row.isActive ? 'Ativo' : 'Inativo'}
          variant={row.isActive ? 'success' : 'neutral'}
        />
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            toggleMutation.mutate(row);
          }}
          disabled={toggleMutation.isPending}
        >
          {row.isActive ? 'Desativar' : 'Ativar'}
        </Button>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Políticas de Retenção</CardTitle>
        <Button
          size="sm"
          onClick={() => {
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Política
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <DataTable
            data={policies ?? []}
            columns={columns}
            keyExtractor={(row) => row.id}
            pageSize={10}
          />
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          Políticas ativas de anonimização são aplicadas automaticamente no dia 1 de cada mês a
          colaboradores inativos cujo fim de contrato ultrapassou o período de retenção.
        </p>
      </CardContent>

      <NewRetentionPolicyDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </Card>
  );
}

const retentionSchema = z.object({
  dataCategory: z.string().min(1, 'A categoria é obrigatória'),
  retentionYears: z.coerce.number().int().min(1, 'Indique um número de anos válido'),
  legalReference: z.string().optional(),
  actionAfterRetention: z.nativeEnum(RetentionAction),
});

type RetentionForm = z.infer<typeof retentionSchema>;

function NewRetentionPolicyDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): React.JSX.Element {
  const queryClient = useQueryClient();

  const methods = useForm<RetentionForm>({
    resolver: zodResolver(retentionSchema),
    defaultValues: {
      dataCategory: '',
      retentionYears: 5,
      legalReference: '',
      actionAfterRetention: RetentionAction.ANONYMIZE,
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: RetentionForm) => createRetentionPolicy(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['gdpr-retention-policies'] });
      onOpenChange(false);
      methods.reset();
    },
  });

  const onSubmit = (values: RetentionForm): void => {
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
          <DialogTitle>Nova Política de Retenção</DialogTitle>
        </DialogHeader>
        <FormProvider {...methods}>
          <form
            onSubmit={(event) => void methods.handleSubmit(onSubmit)(event)}
            className="space-y-4"
          >
            <FormField
              name="dataCategory"
              label="Categoria de Dados"
              placeholder="Ex.: employee_personal_data"
            />
            <FormField name="retentionYears" label="Anos de Retenção" type="number" min={1} />
            <div className="space-y-2">
              <Label htmlFor="actionAfterRetention">Ação após retenção</Label>
              <select
                id="actionAfterRetention"
                {...methods.register('actionAfterRetention')}
                className={selectClass}
              >
                {Object.values(RetentionAction).map((action) => (
                  <option key={action} value={action}>
                    {retentionActionLabels[action]}
                  </option>
                ))}
              </select>
            </div>
            <FormField name="legalReference" label="Referência Legal (opcional)" />
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

// ---------- Incidentes (admin) ----------

const severityLabels: Record<SecurityIncidentSeverity, string> = {
  [SecurityIncidentSeverity.LOW]: 'Baixa',
  [SecurityIncidentSeverity.MEDIUM]: 'Média',
  [SecurityIncidentSeverity.HIGH]: 'Alta',
  [SecurityIncidentSeverity.CRITICAL]: 'Crítica',
};

const severityVariants: Record<SecurityIncidentSeverity, BadgeVariant> = {
  [SecurityIncidentSeverity.LOW]: 'neutral',
  [SecurityIncidentSeverity.MEDIUM]: 'info',
  [SecurityIncidentSeverity.HIGH]: 'warning',
  [SecurityIncidentSeverity.CRITICAL]: 'danger',
};

const incidentStatusLabels: Record<SecurityIncidentStatus, string> = {
  [SecurityIncidentStatus.OPEN]: 'Aberto',
  [SecurityIncidentStatus.INVESTIGATING]: 'Em investigação',
  [SecurityIncidentStatus.RESOLVED]: 'Resolvido',
};

const incidentStatusVariants: Record<SecurityIncidentStatus, BadgeVariant> = {
  [SecurityIncidentStatus.OPEN]: 'danger',
  [SecurityIncidentStatus.INVESTIGATING]: 'warning',
  [SecurityIncidentStatus.RESOLVED]: 'success',
};

function IncidentsTab(): React.JSX.Element {
  const [createOpen, setCreateOpen] = React.useState(false);
  const [manageTarget, setManageTarget] = React.useState<SecurityIncident | null>(null);

  const { data: incidents, isLoading } = useQuery({
    queryKey: ['gdpr-incidents'],
    queryFn: fetchIncidents,
  });

  const columns: Column<SecurityIncident>[] = [
    { key: 'title', header: 'Título', cell: (row) => row.title },
    {
      key: 'severity',
      header: 'Severidade',
      cell: (row) => (
        <StatusBadge
          label={severityLabels[row.severity]}
          variant={severityVariants[row.severity]}
        />
      ),
    },
    { key: 'detectedAt', header: 'Detetado em', cell: (row) => formatDate(row.detectedAt) },
    {
      key: 'affectedSubjects',
      header: 'Titulares Afetados',
      cell: (row) => (row.affectedSubjects !== null ? String(row.affectedSubjects) : '—'),
    },
    {
      key: 'status',
      header: 'Estado',
      cell: (row) => (
        <StatusBadge
          label={incidentStatusLabels[row.status]}
          variant={incidentStatusVariants[row.status]}
        />
      ),
    },
    {
      key: 'reportedToAuthorityAt',
      header: 'Reportado à CNPD',
      cell: (row) => formatDate(row.reportedToAuthorityAt),
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setManageTarget(row);
          }}
        >
          Gerir
        </Button>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Incidentes de Segurança</CardTitle>
        <Button
          size="sm"
          onClick={() => {
            setCreateOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Incidente
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <DataTable
            data={incidents ?? []}
            columns={columns}
            keyExtractor={(row) => row.id}
            pageSize={10}
          />
        )}
      </CardContent>

      <NewIncidentDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ManageIncidentDialog
        incident={manageTarget}
        onOpenChange={(next) => {
          if (!next) setManageTarget(null);
        }}
      />
    </Card>
  );
}

const incidentSchema = z.object({
  title: z.string().min(1, 'O título é obrigatório'),
  description: z.string().optional(),
  severity: z.nativeEnum(SecurityIncidentSeverity),
  affectedSubjects: z.coerce.number().int().min(0).optional(),
});

type IncidentForm = z.infer<typeof incidentSchema>;

function NewIncidentDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): React.JSX.Element {
  const queryClient = useQueryClient();

  const methods = useForm<IncidentForm>({
    resolver: zodResolver(incidentSchema),
    defaultValues: {
      title: '',
      description: '',
      severity: SecurityIncidentSeverity.LOW,
      affectedSubjects: undefined,
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: IncidentForm) => reportIncident(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['gdpr-incidents'] });
      void queryClient.invalidateQueries({ queryKey: ['gdpr-compliance'] });
      onOpenChange(false);
      methods.reset();
    },
  });

  const onSubmit = (values: IncidentForm): void => {
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
          <DialogTitle>Novo Incidente de Segurança</DialogTitle>
        </DialogHeader>
        <FormProvider {...methods}>
          <form
            onSubmit={(event) => void methods.handleSubmit(onSubmit)(event)}
            className="space-y-4"
          >
            <FormField name="title" label="Título" />
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <textarea
                id="description"
                rows={3}
                className={textareaClass}
                {...methods.register('description')}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="severity">Severidade</Label>
                <select id="severity" {...methods.register('severity')} className={selectClass}>
                  {Object.values(SecurityIncidentSeverity).map((severity) => (
                    <option key={severity} value={severity}>
                      {severityLabels[severity]}
                    </option>
                  ))}
                </select>
              </div>
              <FormField name="affectedSubjects" label="Titulares Afetados" type="number" min={0} />
            </div>
            <p className="text-xs text-muted-foreground">
              Incidentes de severidade Alta ou Crítica notificam automaticamente o responsável de
              conformidade (DPO), se configurado.
            </p>
            {createMutation.isError && (
              <p className="text-sm text-red-600">Ocorreu um erro ao registar o incidente.</p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? <LoadingSpinner size={16} /> : 'Registar'}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

function ManageIncidentDialog({
  incident,
  onOpenChange,
}: {
  incident: SecurityIncident | null;
  onOpenChange: (open: boolean) => void;
}): React.JSX.Element {
  const queryClient = useQueryClient();
  const [status, setStatus] = React.useState<SecurityIncidentStatus>(SecurityIncidentStatus.OPEN);
  const [resolutionNotes, setResolutionNotes] = React.useState('');
  const [reportedToAuthority, setReportedToAuthority] = React.useState(false);

  React.useEffect(() => {
    if (incident) {
      setStatus(incident.status);
      setResolutionNotes(incident.resolutionNotes ?? '');
      setReportedToAuthority(incident.reportedToAuthorityAt !== null);
    }
  }, [incident]);

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!incident) {
        return Promise.reject(new Error('Sem incidente selecionado'));
      }
      return updateIncident(incident.id, {
        status,
        resolutionNotes: resolutionNotes || undefined,
        reportedToAuthorityAt:
          reportedToAuthority && !incident.reportedToAuthorityAt
            ? new Date().toISOString()
            : undefined,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['gdpr-incidents'] });
      void queryClient.invalidateQueries({ queryKey: ['gdpr-compliance'] });
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={incident !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerir Incidente</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="incident-status">Estado</Label>
            <select
              id="incident-status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as SecurityIncidentStatus);
              }}
              className={selectClass}
            >
              {Object.values(SecurityIncidentStatus).map((value) => (
                <option key={value} value={value}>
                  {incidentStatusLabels[value]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="resolution-notes">Notas de Resolução</Label>
            <textarea
              id="resolution-notes"
              rows={3}
              className={textareaClass}
              value={resolutionNotes}
              onChange={(e) => {
                setResolutionNotes(e.target.value);
              }}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={reportedToAuthority}
              disabled={incident?.reportedToAuthorityAt !== null && incident !== null}
              onChange={(e) => {
                setReportedToAuthority(e.target.checked);
              }}
            />
            Reportado à autoridade (CNPD)
            {incident?.reportedToAuthorityAt && (
              <span className="text-muted-foreground">
                — {formatDate(incident.reportedToAuthorityAt)}
              </span>
            )}
          </label>
          {updateMutation.isError && (
            <p className="text-sm text-red-600">Ocorreu um erro ao atualizar o incidente.</p>
          )}
        </div>
        <DialogFooter>
          <Button
            disabled={updateMutation.isPending}
            onClick={() => {
              updateMutation.mutate();
            }}
          >
            {updateMutation.isPending ? <LoadingSpinner size={16} /> : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Conformidade (admin) ----------

function ComplianceTab(): React.JSX.Element {
  const { data: report, isLoading } = useQuery({
    queryKey: ['gdpr-compliance'],
    queryFn: fetchComplianceReport,
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const tiles = [
    { label: 'Consentimentos Ativos', value: report?.activeConsents ?? 0 },
    { label: 'Pedidos Pendentes', value: report?.pendingRequests ?? 0 },
    {
      label: 'Pedidos em Atraso',
      value: report?.overdueRequests ?? 0,
      danger: (report?.overdueRequests ?? 0) > 0,
    },
    { label: 'Incidentes Abertos', value: report?.openIncidents ?? 0 },
    {
      label: 'Incidentes Críticos por Reportar',
      value: report?.criticalIncidentsPendingAuthority ?? 0,
      danger: (report?.criticalIncidentsPendingAuthority ?? 0) > 0,
    },
    { label: 'Políticas de Retenção Ativas', value: report?.activeRetentionPolicies ?? 0 },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Gerado em {report ? formatDate(report.generatedAt) : '—'}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => (
          <Card key={tile.label}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{tile.label}</p>
              <p className={`mt-1 text-3xl font-bold ${tile.danger ? 'text-red-600' : ''}`}>
                {tile.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
