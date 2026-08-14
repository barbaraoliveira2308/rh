import apiClient from './client';
import type {
  Ticket,
  TicketCategory,
  TicketComment,
  TicketFilters,
  CreateTicketRequest,
  UpdateTicketRequest,
  AddCommentRequest,
  AssignTicketRequest,
  CreateTicketCategoryRequest,
} from '@/types/helpdesk';

export async function fetchTickets(filters?: TicketFilters): Promise<Ticket[]> {
  const response = await apiClient.get<Ticket[]>('/helpdesk/tickets', { params: filters });
  return response.data;
}

export async function fetchTicket(id: string): Promise<Ticket> {
  const response = await apiClient.get<Ticket>(`/helpdesk/tickets/${id}`);
  return response.data;
}

export async function createTicket(data: CreateTicketRequest): Promise<Ticket> {
  const response = await apiClient.post<Ticket>('/helpdesk/tickets', data);
  return response.data;
}

export async function updateTicket(id: string, data: UpdateTicketRequest): Promise<Ticket> {
  const response = await apiClient.patch<Ticket>(`/helpdesk/tickets/${id}`, data);
  return response.data;
}

export async function assignTicket(id: string, data: AssignTicketRequest): Promise<Ticket> {
  const response = await apiClient.post<Ticket>(`/helpdesk/tickets/${id}/assign`, data);
  return response.data;
}

export async function escalateTicket(id: string): Promise<Ticket> {
  const response = await apiClient.post<Ticket>(`/helpdesk/tickets/${id}/escalate`);
  return response.data;
}

export async function closeTicket(id: string): Promise<Ticket> {
  const response = await apiClient.post<Ticket>(`/helpdesk/tickets/${id}/close`);
  return response.data;
}

export async function fetchTicketComments(id: string): Promise<TicketComment[]> {
  const response = await apiClient.get<TicketComment[]>(`/helpdesk/tickets/${id}/comments`);
  return response.data;
}

export async function addTicketComment(
  id: string,
  data: AddCommentRequest,
): Promise<TicketComment> {
  const response = await apiClient.post<TicketComment>(`/helpdesk/tickets/${id}/comments`, data);
  return response.data;
}

export async function fetchTicketCategories(): Promise<TicketCategory[]> {
  const response = await apiClient.get<TicketCategory[]>('/helpdesk/categories');
  return response.data;
}

export async function createTicketCategory(
  data: CreateTicketCategoryRequest,
): Promise<TicketCategory> {
  const response = await apiClient.post<TicketCategory>('/helpdesk/categories', data);
  return response.data;
}
