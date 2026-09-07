import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { DataTable, type Column } from '@/components/DataTable';
import { fetchExpenses } from '@/api/expenses.api';
import type { ExpenseReport, ExpenseReportStatus } from '@/types/expenses';

const statusVariantMap: Record<ExpenseReportStatus, 'default' | 'warning' | 'success' | 'danger'> =
  {
    draft: 'default',
    pending: 'warning',
    approved: 'success',
    sent_for_payment: 'warning',
    paid: 'success',
    rejected: 'danger',
  };

const statusLabelMap: Record<ExpenseReportStatus, string> = {
  draft: 'Rascunho',
  pending: 'Pendente',
  approved: 'Aprovado',
  sent_for_payment: 'Enviado para pagamento',
  paid: 'Pago',
  rejected: 'Rejeitado',
};

export function ExpensesListPage(): React.JSX.Element {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => fetchExpenses(),
  });

  const columns = React.useMemo<Column<ExpenseReport>[]>(
    () => [
      {
        key: 'title',
        header: 'Título',
        cell: (row): React.ReactNode => (
          <button
            type="button"
            className="font-medium text-brand-800 hover:underline"
            onClick={() => {
              void navigate(`/expenses/${row.id}`);
            }}
          >
            {row.title}
          </button>
        ),
      },
      {
        key: 'period',
        header: 'Período',
        cell: (row): React.ReactNode =>
          `${new Date(row.periodStart).toLocaleDateString('pt-PT')} - ${new Date(row.periodEnd).toLocaleDateString('pt-PT')}`,
      },
      {
        key: 'totalAmount',
        header: 'Total',
        cell: (row): React.ReactNode => `${row.totalAmount.toFixed(2)} €`,
      },
      {
        key: 'status',
        header: 'Estado',
        cell: (row): React.ReactNode => (
          <StatusBadge label={statusLabelMap[row.status]} variant={statusVariantMap[row.status]} />
        ),
      },
    ],
    [navigate],
  );

  return (
    <div>
      <PageHeader
        title="Despesas"
        description="Relatórios de despesas"
        action={{
          label: 'Novo Relatório',
          onClick: () => void navigate('/expenses/new'),
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <DataTable
          data={data ?? []}
          columns={columns}
          keyExtractor={(row) => row.id}
          pageSize={10}
        />
      )}
    </div>
  );
}
