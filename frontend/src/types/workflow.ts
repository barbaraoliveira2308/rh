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

export interface WorkflowItem {
  id: string;
  type: WorkflowItemType;
  referenceId: string;
  referenceType: string;
  requesterId: string;
  assigneeId: string;
  status: WorkflowItemStatus;
  requestedAt: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowCount {
  count: number;
}
