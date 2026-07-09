import apiClient from './client';
import type {
  ExpenseReport,
  ExpenseCategory,
  ExpenseItem,
  CreateExpenseReportRequest,
  CreateExpenseItemRequest,
} from '@/types/expenses';

export async function fetchExpenses(params?: {
  employee_id?: string;
  status?: string;
  month?: string;
}): Promise<ExpenseReport[]> {
  const response = await apiClient.get<ExpenseReport[]>('/expenses', { params });
  return response.data;
}

export async function fetchExpense(id: string): Promise<ExpenseReport> {
  const response = await apiClient.get<ExpenseReport>(`/expenses/${id}`);
  return response.data;
}

export async function createExpenseReport(
  data: CreateExpenseReportRequest,
): Promise<ExpenseReport> {
  const response = await apiClient.post<ExpenseReport>('/expenses', data);
  return response.data;
}

export async function addExpenseItem(
  expenseId: string,
  data: CreateExpenseItemRequest,
): Promise<ExpenseItem> {
  const response = await apiClient.post<ExpenseItem>(`/expenses/${expenseId}/items`, data);
  return response.data;
}

export async function submitExpenseReport(id: string): Promise<ExpenseReport> {
  const response = await apiClient.post<ExpenseReport>(`/expenses/${id}/submit`);
  return response.data;
}

export async function fetchExpenseCategories(): Promise<ExpenseCategory[]> {
  const response = await apiClient.get<ExpenseCategory[]>('/expenses/categories');
  return response.data;
}
