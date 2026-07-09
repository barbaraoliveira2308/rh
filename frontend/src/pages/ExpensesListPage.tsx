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
    DRAFT: 'default',
    PENDING: 'warning',
    APPROVED: 'success',
    REJECTED: 'danger',
  };

const statusLabelMap: Record<ExpenseReportStatus, string> = {
  DRAFT: 'Rascunho',
  PENDING: 'Pendente',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
};

const columns: Column<ExpenseReport>[] = [
  {
    key: 'title',
    header: 'Título',
    cell: (row) => <span className="font-medium">{row.title}</span>,
  },
  {
    key: 'period',
    header: 'Período',
    cell: (row) =>
      `${new Date(row.periodStart).toLocaleDateString('pt-PT')} - ${new Date(row.periodEnd).toLocaleDateString('pt-PT')}`,
  },
  {
    key: 'totalAmount',
    header: 'Total',
    cell: (row) => `${row.totalAmount.toFixed(2)} €`,
  },
  {
    key: 'status',
    header: 'Estado',
    cell: (row) => (
      <StatusBadge label={statusLabelMap[row.status]} variant={statusVariantMap[row.status]} />
    ),
  },
];

export function ExpensesListPage(): React.JSX.Element {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => fetchExpenses(),
  });

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
