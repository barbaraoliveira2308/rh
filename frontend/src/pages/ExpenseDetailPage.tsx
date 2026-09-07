import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchExpense, approveExpense, rejectExpense } from '@/api/expenses.api';
import { useAuthStore } from '@/stores/auth.store';
import { ExpenseReportStatus, type ExpenseItem } from '@/types/expenses';

const MANAGER_ROLES = ['admin', 'manager', 'approver'];

function isManager(roles: string[]): boolean {
  return roles.some((role) => MANAGER_ROLES.includes(role));
}

const statusLabelMap: Record<ExpenseReportStatus, string> = {
  [ExpenseReportStatus.DRAFT]: 'Rascunho',
  [ExpenseReportStatus.PENDING]: 'Pendente',
  [ExpenseReportStatus.APPROVED]: 'Aprovado',
  [ExpenseReportStatus.SENT_FOR_PAYMENT]: 'Enviado para pagamento',
  [ExpenseReportStatus.PAID]: 'Pago',
  [ExpenseReportStatus.REJECTED]: 'Rejeitado',
};

const statusVariantMap: Record<ExpenseReportStatus, 'default' | 'warning' | 'success' | 'danger'> =
  {
    [ExpenseReportStatus.DRAFT]: 'default',
    [ExpenseReportStatus.PENDING]: 'warning',
    [ExpenseReportStatus.APPROVED]: 'success',
    [ExpenseReportStatus.SENT_FOR_PAYMENT]: 'warning',
    [ExpenseReportStatus.PAID]: 'success',
    [ExpenseReportStatus.REJECTED]: 'danger',
  };

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('pt-PT');
}

export function ExpenseDetailPage(): React.JSX.Element {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isManagerUser = user !== null && isManager(user.roles);

  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState('');

  const expenseQuery = useQuery({
    queryKey: ['expense', id],
    queryFn: () => fetchExpense(id),
    enabled: id !== '',
  });

  const approveMutation = useMutation({
    mutationFn: () => approveExpense(id, {}),
    onSuccess: (updated) => {
      queryClient.setQueryData(['expense', id], updated);
      void queryClient.invalidateQueries({ queryKey: ['workflow-inbox'] });
      void queryClient.invalidateQueries({ queryKey: ['workflow-count'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectExpense(id, { reason: rejectReason.trim() }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['expense', id], updated);
      void queryClient.invalidateQueries({ queryKey: ['workflow-inbox'] });
      void queryClient.invalidateQueries({ queryKey: ['workflow-count'] });
      setRejectDialogOpen(false);
      setRejectReason('');
    },
  });

  if (expenseQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const report = expenseQuery.data;

  if (expenseQuery.isError || report === undefined) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Ocorreu um erro ao carregar o relatório de despesas.
      </div>
    );
  }

  const canReview = report.status === ExpenseReportStatus.PENDING && isManagerUser;
  const employeeName = report.employee
    ? `${report.employee.firstName} ${report.employee.lastName}`
    : report.employeeId;
  const items = report.items ?? [];

  return (
    <div>
      <PageHeader
        title={report.title}
        description={employeeName}
        breadcrumb={[
          { label: 'Despesas', href: '/expenses' },
          { label: `${formatDate(report.periodStart)} - ${formatDate(report.periodEnd)}` },
        ]}
      />

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <StatusBadge
          label={statusLabelMap[report.status]}
          variant={statusVariantMap[report.status]}
        />
        {canReview && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => {
                approveMutation.mutate();
              }}
              disabled={approveMutation.isPending}
            >
              Aprovar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setRejectDialogOpen(true);
              }}
              disabled={rejectMutation.isPending}
            >
              Rejeitar
            </Button>
          </div>
        )}
      </div>

      {(approveMutation.isError || rejectMutation.isError) && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Não foi possível concluir a ação. Tente novamente.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Período</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {formatDate(report.periodStart)} - {formatDate(report.periodEnd)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Número de items
            </CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">{String(items.length)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {report.totalAmount.toFixed(2)} {report.currency}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Submetido</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {report.submittedAt !== null ? formatDate(report.submittedAt) : '-'}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Itens de Despesa</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Este relatório não tem itens.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Categoria
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Descrição
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Valor</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Recibo
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: ExpenseItem) => (
                    <tr key={item.id} className="border-b transition-colors hover:bg-muted/50">
                      <td className="px-4 py-3">
                        {item.category !== undefined && (
                          <div className="flex items-center gap-2">
                            {item.isDuplicate && (
                              <StatusBadge label="Duplicado" variant="warning" />
                            )}
                            <span>{item.category.name}</span>
                          </div>
                        )}
                        {item.category === undefined && '-'}
                      </td>
                      <td className="px-4 py-3">{item.description}</td>
                      <td className="px-4 py-3">{formatDate(item.expenseDate)}</td>
                      <td className="px-4 py-3">
                        {item.amount.toFixed(2)} {report.currency}
                      </td>
                      <td className="px-4 py-3">
                        {item.receiptUrl !== null ? (
                          <a
                            href={item.receiptUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-brand-800 hover:underline"
                          >
                            Ver recibo
                          </a>
                        ) : (
                          <span className="text-muted-foreground">Sem recibo</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {(report.notes !== null ||
        (report.status === ExpenseReportStatus.REJECTED && report.rejectionReason !== null)) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Notas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.notes !== null && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Observações</p>
                <p className="text-sm">{report.notes}</p>
              </div>
            )}
            {report.status === ExpenseReportStatus.REJECTED && report.rejectionReason !== null && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Motivo da rejeição</p>
                <p className="text-sm text-red-800">{report.rejectionReason}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="mt-6">
        <Button
          variant="outline"
          onClick={() => {
            void navigate('/expenses');
          }}
        >
          Voltar
        </Button>
      </div>

      <Dialog
        open={rejectDialogOpen}
        onOpenChange={(open) => {
          setRejectDialogOpen(open);
          if (!open) {
            setRejectReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar relatório</DialogTitle>
            <DialogDescription>Indique o motivo da rejeição.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="reject-reason" className="sr-only">
              Motivo
            </Label>
            <Input
              id="reject-reason"
              value={rejectReason}
              onChange={(event) => {
                setRejectReason(event.target.value);
              }}
              placeholder="Motivo da rejeição"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectReason('');
              }}
              disabled={rejectMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={rejectMutation.isPending || rejectReason.trim() === ''}
              onClick={() => {
                rejectMutation.mutate();
              }}
            >
              Rejeitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
