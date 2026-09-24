export interface OpenOpportunity {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  status: 'open' | 'closed';
  skills: string[];
  createdAt: string;
}
