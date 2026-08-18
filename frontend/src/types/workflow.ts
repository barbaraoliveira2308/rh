export enum WorkflowItemType {
  TIMESHEET = 'TIMESHEET',
  ABSENCE = 'ABSENCE',
  EXPENSE = 'EXPENSE',
}

export enum WorkflowItemStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum WorkflowItemPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export interface WorkflowItem {
  id: string;
  type: WorkflowItemType;
  referenceId: string;
  referenceType: string;
  requesterId: string;
  assigneeId: string;
  status: WorkflowItemStatus;
  priority: WorkflowItemPriority;
  dueDate: string | null;
  isOverdue: boolean;
  requestedAt: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowCount {
  count: number;
}

export interface BulkApproveResultItem {
  id: string;
  success: boolean;
  error?: string;
}

export interface BulkApproveResult {
  results: BulkApproveResultItem[];
}
