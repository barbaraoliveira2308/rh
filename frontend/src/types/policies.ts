export enum PolicyStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export interface Policy {
  id: string;
  title: string;
  content: string;
  category: string;
  status: PolicyStatus;
  authorId: string | null;
  publishedAt: string | null;
  version: number;
  parentId: string | null;
  tags: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyFilters {
  q?: string;
  category?: string;
  status?: PolicyStatus;
}

export interface CreatePolicyRequest {
  title: string;
  content: string;
  category: string;
  tags?: string[];
}

export interface UpdatePolicyRequest {
  title?: string;
  content?: string;
  category?: string;
  tags?: string[];
}

export interface PolicyAcceptanceLog {
  id: string;
  userId: string;
  policyId: string;
  policyVersion: number;
  acceptedAt: string;
  user: { username: string; email: string };
  policy: { title: string; category: string };
}

export interface PendingPolicySummary {
  id: string;
  title: string;
  version: number;
}

export interface PendingAcceptanceUser {
  userId: string;
  email: string;
  username: string;
  pendingPolicies: PendingPolicySummary[];
}
