import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, Eye } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge, type BadgeVariant } from '@/components/StatusBadge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  fetchWorkflowInbox,
  approveWorkflowItem,
  rejectWorkflowItem,
  bulkApproveWorkflowItems,
} from '@/api/workflow.api';
import {
  WorkflowItemPriority,
  WorkflowItemType,
  type WorkflowItem,
  type BulkApproveResult,
} from '@/types/workflow';

const detailRouteByType: Record<WorkflowItemType, string> = {
  [WorkflowItemType.TIMESHEET]: '/timesheets',
  [WorkflowItemType.ABSENCE]: '/absences',
  [WorkflowItemType.EXPENSE]: '/expenses',
};

const typeLabelMap: Record<string, string> = {
  TIMESHEET: 'Timesheet',
  ABSENCE: 'Ausência',
  EXPENSE: 'Despesa',
};

const typeVariantMap: Record<string, 'info' | 'warning' | 'default'> = {
  TIMESHEET: 'info',
  ABSENCE: 'warning',
  EXPENSE: 'default',
};

const priorityLabelMap: Record<WorkflowItemPriority, string> = {
  [WorkflowItemPriority.LOW]: 'Baixa',
  [WorkflowItemPriority.NORMAL]: 'Normal',
  [WorkflowItemPriority.HIGH]: 'Alta',
  [WorkflowItemPriority.URGENT]: 'Urgente',
};

const priorityVariantMap: Record<WorkflowItemPriority, BadgeVariant> = {
  [WorkflowItemPriority.LOW]: 'neutral',
  [WorkflowItemPriority.NORMAL]: 'neutral',
  [WorkflowItemPriority.HIGH]: 'warning',
  [WorkflowItemPriority.URGENT]: 'danger',
};

export function WorkflowInboxPage(): React.JSX.Element {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = React.useState<string>('');
  const [rejectItem, setRejectItem] = React.useState<WorkflowItem | null>(null);
  const [rejectReason, setRejectReason] = React.useState('');
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [bulkResult, setBulkResult] = React.useState<BulkApproveResult | null>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ['workflow-inbox', typeFilter],
    queryFn: () => fetchWorkflowInbox(typeFilter || undefined),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveWorkflowItem(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workflow-inbox'] });
      void queryClient.invalidateQueries({ queryKey: ['workflow-count'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (params: { id: string; reason: string }) => rejectWorkflowItem(params.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workflow-inbox'] });
      void queryClient.invalidateQueries({ queryKey: ['workflow-count'] });
      setRejectItem(null);
      setRejectReason('');
    },
  });

  const bulkApproveMutation = useMutation({
    mutationFn: (ids: string[]) => bulkApproveWorkflowItems(ids),
    onSuccess: (result) => {
      setBulkResult(result);
      setSelectedIds(new Set());
      void queryClient.invalidateQueries({ queryKey: ['workflow-inbox'] });
      void queryClient.invalidateQueries({ queryKey: ['workflow-count'] });
    },
  });

  const handleApprove = (id: string): void => {
    approveMutation.mutate(id);
  };

  const handleRejectConfirm = (): void => {
    if (rejectItem) {
      rejectMutation.mutate({ id: rejectItem.id, reason: rejectReason || 'Rejeitado' });
    }
  };

  const filteredItems = items ?? [];

  const selectedType =
    selectedIds.size > 0
      ? (filteredItems.find((item) => selectedIds.has(item.id))?.type ?? null)
      : null;

  const toggleSelected = (item: WorkflowItem): void => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
      }
      return next;
    });
  };

  const handleBulkApprove = (): void => {
    bulkApproveMutation.mutate(Array.from(selectedIds));
  };

  const failedBulkResults = (bulkResult?.results ?? []).filter((result) => !result.success);

  return (
    <div>
      <PageHeader
        title="Caixa de Entrada"
        description="Aprovações pendentes de timesheets, ausências e despesas"
      />

      <div className="mb-4 flex items-center justify-between gap-4">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todos os tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value=" ">Todos os tipos</SelectItem>
            <SelectItem value="TIMESHEET">Timesheets</SelectItem>
            <SelectItem value="ABSENCE">Ausências</SelectItem>
            <SelectItem value="EXPENSE">Despesas</SelectItem>
          </SelectContent>
        </Select>

        {selectedIds.size > 0 && (
          <Button size="sm" onClick={handleBulkApprove} disabled={bulkApproveMutation.isPending}>
            <CheckCircle className="mr-1 h-4 w-4" />
            Aprovar selecionados ({selectedIds.size})
          </Button>
        )}
      </div>

      {failedBulkResults.length > 0 && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {failedBulkResults.length} de {bulkResult?.results.length ?? 0} itens não foram aprovados:{' '}
          {failedBulkResults.map((result) => result.error).join('; ')}
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner />
      ) : filteredItems.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-muted-foreground">Nenhum item pendente de aprovação.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="w-10 px-4 py-3"></th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipo</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Prazo</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Prioridade
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item: WorkflowItem) => (
                <tr key={item.id} className="border-b transition-colors hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      disabled={selectedType !== null && item.type !== selectedType}
                      onChange={() => {
                        toggleSelected(item);
                      }}
                      aria-label={`Selecionar item ${item.id}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      label={typeLabelMap[item.type] ?? item.type}
                      variant={typeVariantMap[item.type] ?? 'neutral'}
                    />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.requestedAt
                      ? new Date(item.requestedAt).toLocaleDateString('pt-PT')
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.dueDate ? new Date(item.dueDate).toLocaleDateString('pt-PT') : '-'}
                    {item.isOverdue && (
                      <span className="ml-1 text-xs font-medium text-red-600">(atrasado)</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      label={priorityLabelMap[item.priority]}
                      variant={priorityVariantMap[item.priority]}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge label="Pendente" variant="warning" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          void navigate(`${detailRouteByType[item.type]}/${item.referenceId}`);
                        }}
                      >
                        <Eye className="mr-1 h-4 w-4" />
                        Ver detalhes
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          handleApprove(item.id);
                        }}
                        disabled={approveMutation.isPending}
                      >
                        <CheckCircle className="mr-1 h-4 w-4 text-green-600" />
                        Aprovar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setRejectItem(item);
                        }}
                        disabled={rejectMutation.isPending}
                      >
                        <XCircle className="mr-1 h-4 w-4 text-red-600" />
                        Rejeitar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={rejectItem !== null}
        title="Rejeitar Item"
        description="Tem a certeza que deseja rejeitar este item?"
        confirmLabel="Rejeitar"
        onConfirm={() => {
          handleRejectConfirm();
        }}
        onCancel={() => {
          setRejectItem(null);
          setRejectReason('');
        }}
        isLoading={rejectMutation.isPending}
      />
    </div>
  );
}
