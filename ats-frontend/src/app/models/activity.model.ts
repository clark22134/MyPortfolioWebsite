export type ActivityType =
  | 'CANDIDATE_CREATED'
  | 'CANDIDATE_UPDATED'
  | 'CANDIDATE_DELETED'
  | 'STAGE_CHANGED'
  | 'NOTE_ADDED'
  | 'TAG_ADDED'
  | 'TAG_REMOVED'
  | 'JOB_CREATED'
  | 'JOB_UPDATED'
  | 'JOB_DELETED'
  | 'TASK_CREATED'
  | 'TASK_COMPLETED'
  | 'TASK_CANCELLED'
  | 'RESUME_UPLOADED';

export const ACTIVITY_ICONS: Record<ActivityType, string> = {
  CANDIDATE_CREATED: '👤',
  CANDIDATE_UPDATED: '✏️',
  CANDIDATE_DELETED: '🗑️',
  STAGE_CHANGED: '➡️',
  NOTE_ADDED: '📝',
  TAG_ADDED: '🏷️',
  TAG_REMOVED: '🏷️',
  JOB_CREATED: '💼',
  JOB_UPDATED: '✏️',
  JOB_DELETED: '🗑️',
  TASK_CREATED: '☑️',
  TASK_COMPLETED: '✅',
  TASK_CANCELLED: '⊘',
  RESUME_UPLOADED: '📎'
};

export interface Activity {
  id: number;
  type: ActivityType;
  candidateId: number | null;
  candidateName: string | null;
  jobId: number | null;
  jobTitle: string | null;
  actorId: number | null;
  actorName: string;
  summary: string;
  metadata: string | null;
  createdAt: string;
}
