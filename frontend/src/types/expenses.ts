export enum ExpenseReportStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface ExpenseCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  isActive: boolean;
}

export interface ExpenseItem {
  id: string;
  expenseReportId: string;
  categoryId: string;
  description: string;
  amount: number;
  expenseDate: string;
  receiptUrl: string | null;
  createdAt: string;
  category?: ExpenseCategory;
}

export interface ExpenseReport {
  id: string;
  employeeId: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  status: ExpenseReportStatus;
  totalAmount: number;
  currency: string;
  projectId: string | null;
  notes: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  items?: ExpenseItem[];
}

export interface CreateExpenseReportRequest {
  title: string;
  periodStart: string;
  periodEnd: string;
  projectId?: string;
  notes?: string;
}

export interface CreateExpenseItemRequest {
  categoryId: string;
  description: string;
  amount: number;
  expenseDate: string;
  receiptUrl?: string;
}
