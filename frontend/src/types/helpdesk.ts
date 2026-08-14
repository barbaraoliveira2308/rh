export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  PENDING = 'pending',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  categoryId: string | null;
  submitterId: string;
  assigneeId: string | null;
  teamId: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  slaDeadline: string | null;
  slaBreached: boolean;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketCategory {
  id: string;
  name: string;
  defaultPriority: TicketPriority;
  slaHours: number;
  resolutionTeamId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  userId: string;
  text: string;
  isInternal: boolean;
  createdAt: string;
}

export interface TicketFilters {
  status?: string;
  priority?: string;
  categoryId?: string;
}

export interface CreateTicketRequest {
  title: string;
  description: string;
  categoryId?: string;
  teamId?: string;
}

export interface UpdateTicketRequest {
  title?: string;
  description?: string;
  categoryId?: string;
  assigneeId?: string;
  teamId?: string;
  priority?: TicketPriority;
  status?: TicketStatus;
}

export interface AddCommentRequest {
  text: string;
  isInternal?: boolean;
}

export interface AssignTicketRequest {
  agentId: string;
}

export interface CreateTicketCategoryRequest {
  name: string;
  defaultPriority?: TicketPriority;
  slaHours: number;
  resolutionTeamId?: string;
}
