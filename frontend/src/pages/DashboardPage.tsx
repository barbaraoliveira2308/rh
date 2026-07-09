import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';

export function DashboardPage(): React.JSX.Element {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Visão geral do sistema de gestão de recursos humanos"
      />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground">Colaboradores</h3>
          <p className="mt-2 text-3xl font-bold">-</p>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground">Projetos ativos</h3>
          <p className="mt-2 text-3xl font-bold">-</p>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground">Tickets pendentes</h3>
          <p className="mt-2 text-3xl font-bold">-</p>
        </div>
      </div>
      <div className="mt-6">
        <StatusBadge label="Sistema operacional" variant="success" />
      </div>
    </div>
  );
}
