import apiClient, { BACKGROUND_REQUEST } from './client';
import type { WorkflowItem, WorkflowCount, BulkApproveResult } from '@/types/workflow';

export async function fetchWorkflowInbox(type?: string): Promise<WorkflowItem[]> {
  const params: Record<string, string> = { status: 'PENDING' };
  if (type) {
    params.type = type;
  }
  const response = await apiClient.get<WorkflowItem[]>('/workflow/inbox', { params });
  return response.data;
}

export async function fetchWorkflowInboxCount(): Promise<WorkflowCount> {
  const response = await apiClient.get<WorkflowCount>('/workflow/inbox/count', BACKGROUND_REQUEST);
  return response.data;
}

export async function approveWorkflowItem(id: string): Promise<WorkflowItem> {
  const response = await apiClient.post<WorkflowItem>(`/workflow/inbox/${id}/approve`);
  return response.data;
}

export async function rejectWorkflowItem(id: string): Promise<WorkflowItem> {
  const response = await apiClient.post<WorkflowItem>(`/workflow/inbox/${id}/reject`);
  return response.data;
}

export async function bulkApproveWorkflowItems(ids: string[]): Promise<BulkApproveResult> {
  const response = await apiClient.post<BulkApproveResult>('/workflow/inbox/bulk-approve', {
    ids,
  });
  return response.data;
}
