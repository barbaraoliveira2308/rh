export enum ReportType {
  TIMESHEETS = 'timesheets',
  ABSENCES = 'absences',
  EXPENSES = 'expenses',
  PROJECT_HOURS = 'project_hours',
  TEAM_OCCUPANCY = 'team_occupancy',
  MARGINS = 'margins',
  CONTRACTS_EXPIRING = 'contracts_expiring',
  AUDIT = 'audit',
}

export enum ReportFormat {
  JSON = 'json',
  XLSX = 'xlsx',
  PDF = 'pdf',
}

export enum ReportFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export enum ReportJobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  [ReportType.TIMESHEETS]: 'Horas por colaborador/projeto',
  [ReportType.ABSENCES]: 'Ausências',
  [ReportType.EXPENSES]: 'Despesas',
  [ReportType.PROJECT_HOURS]: 'Horas por projeto',
  [ReportType.TEAM_OCCUPANCY]: 'Ocupação de equipa',
  [ReportType.MARGINS]: 'Margem por consultor',
  [ReportType.CONTRACTS_EXPIRING]: 'Contratos a expirar',
  [ReportType.AUDIT]: 'Auditoria',
};

export interface ReportJob {
  id: string;
  scheduledReportId: string | null;
  reportType: ReportType;
  filters: Record<string, unknown>;
  format: string;
  status: ReportJobStatus;
  resultUrl: string | null;
  errorMessage: string | null;
  rowCount: number | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledReport {
  id: string;
  name: string;
  reportType: ReportType;
  frequency: ReportFrequency;
  recipients: string[];
  format: ReportFormat;
  nextRunAt: string | null;
  lastRunAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateScheduledReportPayload {
  name: string;
  reportType: ReportType;
  filters: Record<string, unknown>;
  frequency: ReportFrequency;
  recipients: string[];
  format: ReportFormat;
}

export type ReportResult =
  | { kind: 'data'; rows: Record<string, unknown>[] }
  | { kind: 'job'; jobId: string }
  | { kind: 'file'; blob: Blob; filename: string };
