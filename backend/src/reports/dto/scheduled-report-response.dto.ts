export class ScheduledReportResponseDto {
  id: string;
  name: string;
  reportType: string;
  frequency: string;
  recipients: string[];
  format: string;
  nextRunAt: Date | null;
  lastRunAt: Date | null;
  isActive: boolean;
  createdAt: Date;
}
