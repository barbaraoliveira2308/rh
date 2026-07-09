import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
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
import { fetchWorkflowInbox, approveWorkflowItem, rejectWorkflowItem } from '@/api/workflow.api';
import type { WorkflowItem } from '@/types/workflow';

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

export function WorkflowInboxPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = React.useState<string>('');
  const [rejectItem, setRejectItem] = React.useState<WorkflowItem | null>(null);
  const [rejectReason, setRejectReason] = React.useState('');

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

  const handleApprove = (id: string): void => {
    approveMutation.mutate(id);
  };

  const handleRejectConfirm = (): void => {
    if (rejectItem) {
      rejectMutation.mutate({ id: rejectItem.id, reason: rejectReason || 'Rejeitado' });
    }
  };

  const filteredItems = items ?? [];

  return (
    <div>
      <PageHeader
        title="Caixa de Entrada"
        description="Aprovações pendentes de timesheets, ausências e despesas"
      />

      <div className="mb-4">
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
      </div>

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
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipo</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item: WorkflowItem) => (
                <tr key={item.id} className="border-b transition-colors hover:bg-muted/50">
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
                  <td className="px-4 py-3">
                    <StatusBadge label="Pendente" variant="warning" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
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
