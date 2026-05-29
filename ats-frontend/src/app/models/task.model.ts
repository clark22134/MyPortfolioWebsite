export type TaskStatus = 'OPEN' | 'DONE' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Low',
  NORMAL: 'Normal',
  HIGH: 'High',
  URGENT: 'Urgent'
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: '#64748b',
  NORMAL: '#3b82f6',
  HIGH: '#f59e0b',
  URGENT: '#ef4444'
};

export interface Task {
  id: number;
  subject: string;
  description: string | null;
  candidateId: number | null;
  candidateName: string | null;
  jobId: number | null;
  jobTitle: string | null;
  assigneeId: number | null;
  assigneeName: string;
  creatorId: number | null;
  creatorName: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface TaskRequest {
  subject: string;
  description?: string;
  candidateId?: number | null;
  jobId?: number | null;
  assigneeId?: number | null;
  priority?: TaskPriority;
  dueAt?: string | null;
}
