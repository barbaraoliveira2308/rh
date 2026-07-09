export enum TimesheetStatus {
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum EntryType {
  WORK = 'work',
  ABSENCE = 'absence',
  HOLIDAY = 'holiday',
  WEEKEND = 'weekend',
}

export interface TimesheetPeriod {
  id: string;
  employeeId: string;
  periodYear: number;
  periodMonth: number;
  status: TimesheetStatus;
  submittedAt: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  totalPlannedHours: number;
  totalWorkedHours: number;
  totalOvertimeHours: number;
  hoursBalance: number;
  createdAt: string;
  updatedAt: string;
  employee?: EmployeeSummary;
  entries?: TimesheetEntry[];
}

export interface EmployeeSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface TimesheetEntry {
  id: string;
  timesheetId: string;
  entryDate: string;
  projectId: string | null;
  absenceId: string | null;
  plannedHours: number;
  workedHours: number;
  overtimeHours: number;
  entryType: EntryType;
  notes: string | null;
  isLocked: boolean;
}

export interface TimesheetFilters {
  employeeId?: string;
  year?: number;
  month?: number;
  status?: TimesheetStatus;
}

export interface CreateTimesheetEntryRequest {
  workedHours?: number;
  projectId?: string;
  notes?: string;
}

export interface ApproveTimesheetRequest {
  comment?: string;
}

export interface RejectTimesheetRequest {
  reason: string;
}

export interface BulkApproveRequest {
  ids: string[];
}
