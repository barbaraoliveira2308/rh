export class ReportJobResponseDto {
  id: string;
  reportType: string;
  format: string;
  status: string;
  resultUrl: string | null;
  errorMessage: string | null;
  rowCount: number | null;
  createdAt: Date;
  completedAt: Date | null;
}
