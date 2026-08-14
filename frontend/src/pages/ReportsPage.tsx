import React from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Download, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { StatusBadge, type BadgeVariant } from '@/components/StatusBadge';
import { DataTable, type Column } from '@/components/DataTable';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FormField } from '@/components/FormField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/stores/auth.store';
import { fetchEmployees } from '@/api/users.api';
import { fetchProjects } from '@/api/projects.api';
import { fetchTeams } from '@/api/capacity.api';
import { fetchExpenseCategories } from '@/api/expenses.api';
import { fetchAbsenceTypes } from '@/api/absences.api';
import {
  generateTimesheetsReport,
  generateAbsencesReport,
  generateExpensesReport,
  generateProjectHoursReport,
  generateTeamOccupancyReport,
  generateMarginsReport,
  generateContractsExpiringReport,
  generateAuditReport,
  fetchReportJob,
  downloadReportJobFile,
  fetchSchedules,
  createSchedule,
  deleteSchedule,
} from '@/api/reports.api';
import {
  ReportType,
  ReportFormat,
  ReportFrequency,
  ReportJobStatus,
  REPORT_TYPE_LABELS,
  type ReportResult,
  type ScheduledReport,
} from '@/types/reports';

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function currentPeriod(): string {
  const now = new Date();
  return `${String(now.getFullYear())}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

interface ReportFilters {
  from: string;
  to: string;
  employeeId: string;
  projectId: string;
  teamId: string;
  categoryId: string;
  typeId: string;
  period: string;
  days: string;
  userId: string;
  action: string;
}

const emptyFilters: ReportFilters = {
  from: '',
  to: '',
  employeeId: '',
  projectId: '',
  teamId: '',
  categoryId: '',
  typeId: '',
  period: currentPeriod(),
  days: '30',
  userId: '',
  action: '',
};

const jobStatusLabels: Record<ReportJobStatus, string> = {
  [ReportJobStatus.PENDING]: 'Pendente',
  [ReportJobStatus.PROCESSING]: 'A processar',
  [ReportJobStatus.COMPLETED]: 'Concluído',
  [ReportJobStatus.FAILED]: 'Falhou',
};

const jobStatusVariants: Record<ReportJobStatus, BadgeVariant> = {
  [ReportJobStatus.PENDING]: 'neutral',
  [ReportJobStatus.PROCESSING]: 'info',
  [ReportJobStatus.COMPLETED]: 'success',
  [ReportJobStatus.FAILED]: 'danger',
};

export function ReportsPage(): React.JSX.Element {
  const roles = useAuthStore((state) => state.user?.roles ?? []);
  const isAdmin = roles.includes('admin');
  const isManagerOrAdmin = roles.some((role) => ['admin', 'manager'].includes(role));

  if (!isManagerOrAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div>
      <PageHeader
        title="Relatórios"
        description="Geração de relatórios operacionais e agendamento de envio periódico"
      />

      <Tabs defaultValue="generate">
        <TabsList>
          <TabsTrigger value="generate">Gerar Relatório</TabsTrigger>
          {isAdmin && <TabsTrigger value="schedules">Agendamentos</TabsTrigger>}
        </TabsList>

        <TabsContent value="generate">
          <GenerateReportTab />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="schedules">
            <SchedulesTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

interface AsyncJob {
  jobId: string;
  reportType: ReportType;
  format: ReportFormat;
}

function GenerateReportTab(): React.JSX.Element {
  const [reportType, setReportType] = React.useState<ReportType>(ReportType.TIMESHEETS);
  const [format, setFormat] = React.useState<ReportFormat>(ReportFormat.JSON);
  const [filters, setFilters] = React.useState<ReportFilters>(emptyFilters);
  const [previewRows, setPreviewRows] = React.useState<Record<string, unknown>[] | null>(null);
  const [jobs, setJobs] = React.useState<AsyncJob[]>([]);

  const { data: employees } = useQuery({
    queryKey: ['reports-employees'],
    queryFn: () => fetchEmployees({ limit: 100 }),
  });
  const { data: projects } = useQuery({
    queryKey: ['reports-projects'],
    queryFn: () => fetchProjects(),
  });
  const { data: teams } = useQuery({ queryKey: ['reports-teams'], queryFn: fetchTeams });
  const { data: categories } = useQuery({
    queryKey: ['reports-expense-categories'],
    queryFn: fetchExpenseCategories,
  });
  const { data: absenceTypes } = useQuery({
    queryKey: ['reports-absence-types'],
    queryFn: fetchAbsenceTypes,
  });

  const updateFilter = (key: keyof ReportFilters, value: string): void => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const generateMutation = useMutation({
    mutationFn: async (): Promise<ReportResult> => {
      switch (reportType) {
        case ReportType.TIMESHEETS:
          return generateTimesheetsReport(
            {
              from: filters.from || undefined,
              to: filters.to || undefined,
              employeeId: filters.employeeId || undefined,
              projectId: filters.projectId || undefined,
            },
            format,
          );
        case ReportType.ABSENCES:
          return generateAbsencesReport(
            {
              from: filters.from || undefined,
              to: filters.to || undefined,
              employeeId: filters.employeeId || undefined,
              typeId: filters.typeId || undefined,
            },
            format,
          );
        case ReportType.EXPENSES:
          return generateExpensesReport(
            {
              from: filters.from || undefined,
              to: filters.to || undefined,
              employeeId: filters.employeeId || undefined,
              categoryId: filters.categoryId || undefined,
            },
            format,
          );
        case ReportType.PROJECT_HOURS:
          return generateProjectHoursReport(filters.projectId, filters.period, format);
        case ReportType.TEAM_OCCUPANCY:
          return generateTeamOccupancyReport(filters.teamId, filters.period, format);
        case ReportType.MARGINS:
          return generateMarginsReport(filters.period, format);
        case ReportType.CONTRACTS_EXPIRING:
          return generateContractsExpiringReport(Number(filters.days || 30), format);
        case ReportType.AUDIT:
          return generateAuditReport(
            {
              from: filters.from || undefined,
              to: filters.to || undefined,
              userId: filters.userId || undefined,
              action: filters.action || undefined,
            },
            format,
          );
        default:
          throw new Error('Tipo de relatório desconhecido');
      }
    },
    onSuccess: (result) => {
      setPreviewRows(null);
      if (result.kind === 'file') {
        triggerDownload(result.blob, result.filename);
      } else if (result.kind === 'job') {
        setJobs((prev) => [{ jobId: result.jobId, reportType, format }, ...prev]);
      } else {
        setPreviewRows(result.rows);
      }
    },
  });

  const canSubmit =
    (reportType !== ReportType.PROJECT_HOURS || filters.projectId !== '') &&
    (reportType !== ReportType.TEAM_OCCUPANCY || filters.teamId !== '') &&
    ((reportType !== ReportType.PROJECT_HOURS &&
      reportType !== ReportType.TEAM_OCCUPANCY &&
      reportType !== ReportType.MARGINS) ||
      filters.period !== '');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Tipo de Relatório</Label>
              <Select
                value={reportType}
                onValueChange={(value) => {
                  setReportType(value as ReportType);
                  setPreviewRows(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ReportType).map((type) => (
                    <SelectItem key={type} value={type}>
                      {REPORT_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Formato</Label>
              <Select
                value={format}
                onValueChange={(value) => {
                  setFormat(value as ReportFormat);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ReportFormat.JSON}>JSON (pré-visualização)</SelectItem>
                  <SelectItem value={ReportFormat.XLSX}>Excel</SelectItem>
                  <SelectItem value={ReportFormat.PDF}>PDF</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <ReportFilterFields
            reportType={reportType}
            filters={filters}
            onChange={updateFilter}
            employees={employees?.data ?? []}
            projects={projects ?? []}
            teams={teams ?? []}
            categories={categories ?? []}
            absenceTypes={absenceTypes ?? []}
          />

          {generateMutation.isError && (
            <p className="text-sm text-red-600">Ocorreu um erro ao gerar o relatório.</p>
          )}

          <Button
            onClick={() => {
              generateMutation.mutate();
            }}
            disabled={!canSubmit || generateMutation.isPending}
          >
            {generateMutation.isPending ? <LoadingSpinner size={16} /> : 'Gerar Relatório'}
          </Button>
        </CardContent>
      </Card>

      {previewRows && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Pré-visualização ({previewRows.length} linhas)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReportPreviewTable rows={previewRows} />
          </CardContent>
        </Card>
      )}

      {jobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Relatórios em Processamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Relatório
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Formato
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground" />
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <JobRow key={job.jobId} job={job} />
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface SelectOption {
  id: string;
  name: string;
}

function ReportFilterFields({
  reportType,
  filters,
  onChange,
  employees,
  projects,
  teams,
  categories,
  absenceTypes,
}: {
  reportType: ReportType;
  filters: ReportFilters;
  onChange: (key: keyof ReportFilters, value: string) => void;
  employees: { id: string; firstName: string; lastName: string }[];
  projects: SelectOption[];
  teams: SelectOption[];
  categories: SelectOption[];
  absenceTypes: SelectOption[];
}): React.JSX.Element {
  const employeeSelect = (
    <div className="space-y-2">
      <Label>Colaborador (opcional)</Label>
      <select
        value={filters.employeeId}
        onChange={(e) => {
          onChange('employeeId', e.target.value);
        }}
        className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <option value="">Todos</option>
        {employees.map((employee) => (
          <option key={employee.id} value={employee.id}>
            {employee.firstName} {employee.lastName}
          </option>
        ))}
      </select>
    </div>
  );

  const periodField = (
    <div className="space-y-2">
      <Label>Período</Label>
      <Input
        type="month"
        value={filters.period}
        onChange={(e) => {
          onChange('period', e.target.value);
        }}
      />
    </div>
  );

  const fromToFields = (
    <>
      <div className="space-y-2">
        <Label>De</Label>
        <Input
          type="date"
          value={filters.from}
          onChange={(e) => {
            onChange('from', e.target.value);
          }}
        />
      </div>
      <div className="space-y-2">
        <Label>Até</Label>
        <Input
          type="date"
          value={filters.to}
          onChange={(e) => {
            onChange('to', e.target.value);
          }}
        />
      </div>
    </>
  );

  switch (reportType) {
    case ReportType.TIMESHEETS:
      return (
        <div className="grid gap-4 sm:grid-cols-4">
          {fromToFields}
          {employeeSelect}
          <div className="space-y-2">
            <Label>Projeto (opcional)</Label>
            <select
              value={filters.projectId}
              onChange={(e) => {
                onChange('projectId', e.target.value);
              }}
              className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Todos</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      );
    case ReportType.ABSENCES:
      return (
        <div className="grid gap-4 sm:grid-cols-4">
          {fromToFields}
          {employeeSelect}
          <div className="space-y-2">
            <Label>Tipo (opcional)</Label>
            <select
              value={filters.typeId}
              onChange={(e) => {
                onChange('typeId', e.target.value);
              }}
              className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Todos</option>
              {absenceTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      );
    case ReportType.EXPENSES:
      return (
        <div className="grid gap-4 sm:grid-cols-4">
          {fromToFields}
          {employeeSelect}
          <div className="space-y-2">
            <Label>Categoria (opcional)</Label>
            <select
              value={filters.categoryId}
              onChange={(e) => {
                onChange('categoryId', e.target.value);
              }}
              className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Todas</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      );
    case ReportType.PROJECT_HOURS:
      return (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Projeto</Label>
            <select
              value={filters.projectId}
              onChange={(e) => {
                onChange('projectId', e.target.value);
              }}
              className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Selecionar…</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          {periodField}
        </div>
      );
    case ReportType.TEAM_OCCUPANCY:
      return (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Equipa</Label>
            <select
              value={filters.teamId}
              onChange={(e) => {
                onChange('teamId', e.target.value);
              }}
              className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Selecionar…</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
          {periodField}
        </div>
      );
    case ReportType.MARGINS:
      return <div className="grid gap-4 sm:grid-cols-3">{periodField}</div>;
    case ReportType.CONTRACTS_EXPIRING:
      return (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Dias até expiração</Label>
            <Input
              type="number"
              min={1}
              value={filters.days}
              onChange={(e) => {
                onChange('days', e.target.value);
              }}
            />
          </div>
        </div>
      );
    case ReportType.AUDIT:
      return (
        <div className="grid gap-4 sm:grid-cols-4">
          {fromToFields}
          <div className="space-y-2">
            <Label>Utilizador ID (opcional)</Label>
            <Input
              value={filters.userId}
              onChange={(e) => {
                onChange('userId', e.target.value);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Ação (opcional)</Label>
            <Input
              value={filters.action}
              onChange={(e) => {
                onChange('action', e.target.value);
              }}
            />
          </div>
        </div>
      );
    default:
      return <></>;
  }
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '—';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}

function ReportPreviewTable({ rows }: { rows: Record<string, unknown>[] }): React.JSX.Element {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">O relatório não devolveu linhas.</p>;
  }

  const indexed: Record<string, unknown>[] = rows.map((row, index) => ({
    ...row,
    __rowKey: String(index),
  }));
  const keys = Object.keys(rows[0] ?? {});
  const columns: Column<Record<string, unknown>>[] = keys.map((key) => ({
    key,
    header: key,
    cell: (row): string => formatCellValue(row[key]),
  }));

  return (
    <DataTable
      data={indexed}
      columns={columns}
      keyExtractor={(row) => String(row.__rowKey)}
      pageSize={15}
    />
  );
}

function JobRow({ job }: { job: AsyncJob }): React.JSX.Element {
  const { data } = useQuery({
    queryKey: ['report-job', job.jobId],
    queryFn: () => fetchReportJob(job.jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === ReportJobStatus.COMPLETED || status === ReportJobStatus.FAILED
        ? false
        : 3000;
    },
  });

  const downloadMutation = useMutation({
    mutationFn: () => downloadReportJobFile(job.jobId),
    onSuccess: (blob) => {
      triggerDownload(blob, `${job.reportType}.${job.format}`);
    },
  });

  const status = data?.status ?? ReportJobStatus.PENDING;

  return (
    <tr className="border-b">
      <td className="px-4 py-3">{REPORT_TYPE_LABELS[job.reportType]}</td>
      <td className="px-4 py-3 uppercase">{job.format}</td>
      <td className="px-4 py-3">
        <StatusBadge label={jobStatusLabels[status]} variant={jobStatusVariants[status]} />
        {status === ReportJobStatus.FAILED && data?.errorMessage && (
          <p className="mt-1 text-xs text-red-600">{data.errorMessage}</p>
        )}
      </td>
      <td className="px-4 py-3">
        {status === ReportJobStatus.COMPLETED && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              downloadMutation.mutate();
            }}
            disabled={downloadMutation.isPending}
          >
            <Download className="mr-2 h-4 w-4" />
            Descarregar
          </Button>
        )}
      </td>
    </tr>
  );
}

const frequencyLabels: Record<ReportFrequency, string> = {
  [ReportFrequency.DAILY]: 'Diária',
  [ReportFrequency.WEEKLY]: 'Semanal',
  [ReportFrequency.MONTHLY]: 'Mensal',
};

function SchedulesTab(): React.JSX.Element {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<ScheduledReport | null>(null);

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['report-schedules'],
    queryFn: fetchSchedules,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSchedule(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['report-schedules'] });
      setDeleteTarget(null);
    },
  });

  const columns: Column<ScheduledReport>[] = [
    { key: 'name', header: 'Nome', cell: (row) => row.name },
    { key: 'reportType', header: 'Tipo', cell: (row) => REPORT_TYPE_LABELS[row.reportType] },
    { key: 'frequency', header: 'Frequência', cell: (row) => frequencyLabels[row.frequency] },
    { key: 'format', header: 'Formato', cell: (row) => row.format.toUpperCase() },
    { key: 'recipients', header: 'Destinatários', cell: (row) => row.recipients.join(', ') },
    {
      key: 'nextRunAt',
      header: 'Próxima Execução',
      cell: (row) => (row.nextRunAt ? new Date(row.nextRunAt).toLocaleString('pt-PT') : '—'),
    },
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
          variant="ghost"
          size="icon"
          onClick={() => {
            setDeleteTarget(row);
          }}
        >
          <Trash2 className="h-4 w-4 text-red-600" />
        </Button>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Relatórios Agendados</CardTitle>
        <Button
          size="sm"
          onClick={() => {
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Agendamento
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <DataTable
            data={schedules ?? []}
            columns={columns}
            keyExtractor={(row) => row.id}
            pageSize={10}
          />
        )}
      </CardContent>

      <NewScheduleDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Remover agendamento"
        description={`Tem a certeza que quer remover o agendamento "${deleteTarget?.name ?? ''}"? Esta ação não pode ser desfeita.`}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id);
          }
        }}
        onCancel={() => {
          setDeleteTarget(null);
        }}
        isLoading={deleteMutation.isPending}
      />
    </Card>
  );
}

const scheduleSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório'),
  reportType: z.nativeEnum(ReportType),
  format: z.nativeEnum(ReportFormat),
  frequency: z.nativeEnum(ReportFrequency),
  recipients: z.string().min(1, 'Indique pelo menos um destinatário'),
  filtersJson: z.string(),
});

type ScheduleForm = z.infer<typeof scheduleSchema>;

function NewScheduleDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): React.JSX.Element {
  const queryClient = useQueryClient();

  const methods = useForm<ScheduleForm>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      name: '',
      reportType: ReportType.TIMESHEETS,
      format: ReportFormat.XLSX,
      frequency: ReportFrequency.MONTHLY,
      recipients: '',
      filtersJson: '{}',
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: ScheduleForm) =>
      createSchedule({
        name: values.name,
        reportType: values.reportType,
        format: values.format,
        frequency: values.frequency,
        recipients: values.recipients
          .split(',')
          .map((email) => email.trim())
          .filter((email) => email.length > 0),
        filters: JSON.parse(values.filtersJson) as Record<string, unknown>,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['report-schedules'] });
      onOpenChange(false);
      methods.reset();
    },
  });

  const onSubmit = (values: ScheduleForm): void => {
    try {
      JSON.parse(values.filtersJson);
    } catch {
      methods.setError('filtersJson', { message: 'JSON inválido' });
      return;
    }
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
          <DialogTitle>Novo Agendamento</DialogTitle>
        </DialogHeader>
        <FormProvider {...methods}>
          <form
            onSubmit={(event) => void methods.handleSubmit(onSubmit)(event)}
            className="space-y-4"
          >
            <FormField name="name" label="Nome" />

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="reportType">Tipo de Relatório</Label>
                <select
                  id="reportType"
                  {...methods.register('reportType')}
                  className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {Object.values(ReportType).map((type) => (
                    <option key={type} value={type}>
                      {REPORT_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="format">Formato</Label>
                <select
                  id="format"
                  {...methods.register('format')}
                  className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value={ReportFormat.XLSX}>Excel</option>
                  <option value={ReportFormat.PDF}>PDF</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequência</Label>
                <select
                  id="frequency"
                  {...methods.register('frequency')}
                  className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value={ReportFrequency.DAILY}>Diária</option>
                  <option value={ReportFrequency.WEEKLY}>Semanal</option>
                  <option value={ReportFrequency.MONTHLY}>Mensal</option>
                </select>
              </div>
            </div>

            <FormField
              name="recipients"
              label="Destinatários (emails separados por vírgula)"
              placeholder="ana@empresa.pt, bruno@empresa.pt"
            />

            <div className="space-y-2">
              <Label htmlFor="filtersJson">Filtros (JSON)</Label>
              <textarea
                id="filtersJson"
                rows={3}
                className="flex w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                {...methods.register('filtersJson')}
              />
              <p className="text-xs text-muted-foreground">
                Ex.: {'{"from":"2026-01-01","to":"2026-01-31"}'}. Relatórios de
                projeto/equipa/margem requerem projectId/teamId/period.
              </p>
              {methods.formState.errors.filtersJson && (
                <p className="text-xs text-red-600">
                  {methods.formState.errors.filtersJson.message}
                </p>
              )}
            </div>

            {createMutation.isError && (
              <p className="text-sm text-red-600">Ocorreu um erro ao criar o agendamento.</p>
            )}

            <DialogFooter>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? <LoadingSpinner size={16} /> : 'Criar Agendamento'}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
