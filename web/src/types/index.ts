export interface Customer {
  id: number;
  name: string;
}

export interface Manufacturer {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  name: string;
  manufacturerId: number;
}

export interface FollowUp {
  id: number;
  meetingId: number;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  dueAt?: string | null;
  suggestedOwnerName?: string | null;
  assigneeUserId?: number | null;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
}

export interface Meeting {
  id: number;
  title: string;
  content: string;
  occurredAt: string;
  customerId: number;
  manufacturerId: number;
  productId: number;
  createdAt: string;
  analysis?: { summary: string } | null;
  followups?: FollowUp[];
}
