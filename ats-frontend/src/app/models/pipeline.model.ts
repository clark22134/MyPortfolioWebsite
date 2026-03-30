export type PipelineStage = 'APPLIED' | 'SCREENING' | 'INTERVIEW' | 'ASSESSMENT' | 'OFFER' | 'HIRED' | 'REJECTED';

export const PIPELINE_STAGES: PipelineStage[] = [
  'APPLIED', 'SCREENING', 'INTERVIEW', 'ASSESSMENT', 'OFFER', 'HIRED', 'REJECTED'
];

export const STAGE_LABELS: Record<PipelineStage, string> = {
  APPLIED: 'Applied',
  SCREENING: 'Screening',
  INTERVIEW: 'Interview',
  ASSESSMENT: 'Assessment',
  OFFER: 'Offer',
  HIRED: 'Hired',
  REJECTED: 'Rejected'
};

export const STAGE_COLORS: Record<PipelineStage, string> = {
  APPLIED: '#6366f1',
  SCREENING: '#8b5cf6',
  INTERVIEW: '#3b82f6',
  ASSESSMENT: '#f59e0b',
  OFFER: '#22c55e',
  HIRED: '#10b981',
  REJECTED: '#ef4444'
};
