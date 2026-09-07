export enum ExpenseReportStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  SENT_FOR_PAYMENT = 'sent_for_payment',
  PAID = 'paid',
  REJECTED = 'rejected',
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
  reportId: string;
  categoryId: string;
  description: string;
  amount: number;
  currency: string;
  expenseDate: string;
  receiptUrl: string | null;
  isDuplicate: boolean;
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
  paidAt: string | null;
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

export interface ApproveExpenseRequest {
  comment?: string;
}

export interface RejectExpenseRequest {
  reason: string;
  comment?: string;
}
