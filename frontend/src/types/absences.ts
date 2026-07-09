export enum AbsenceStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export interface AbsenceType {
  id: string;
  name: string;
  code: string;
  unit: 'days' | 'hours';
  limitPerYear: number | null;
  requiresDocument: boolean;
  isPaid: boolean;
  affectsBalance: boolean;
  color: string | null;
  isSystem: boolean;
  isActive: boolean;
}

export interface AbsenceRequest {
  id: string;
  employeeId: string;
  absenceTypeId: string;
  startDate: string;
  endDate: string;
  startHalf: boolean;
  endHalf: boolean;
  totalDays: number;
  totalHours: number;
  status: AbsenceStatus;
  reason: string | null;
  rejectionReason: string | null;
  documentUrl: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: EmployeeSummary;
  absenceType?: AbsenceType;
}

export interface EmployeeSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface LeaveBalance {
  id: string;
  employeeId: string;
  absenceTypeId: string;
  year: number;
  entitledDays: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
  carryOverDays: number;
  absenceType?: AbsenceType;
}

export interface AbsenceFilters {
  employeeId?: string;
  type?: string;
  status?: AbsenceStatus;
  year?: number;
}

export interface CreateAbsenceRequest {
  absenceTypeId: string;
  startDate: string;
  endDate: string;
  startHalf?: boolean;
  endHalf?: boolean;
  reason?: string;
}

export interface ApproveAbsenceRequest {
  comments?: string;
}

export interface RejectAbsenceRequest {
  reason: string;
}
