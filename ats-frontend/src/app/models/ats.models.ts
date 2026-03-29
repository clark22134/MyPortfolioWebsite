export type JobStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'ON_HOLD';
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP';
export type PipelineStage = 'APPLIED' | 'SCREENING' | 'INTERVIEW' | 'ASSESSMENT' | 'OFFER' | 'HIRED' | 'REJECTED';

export interface Job {
  id: number;
  employer: string;
  title: string;
  department: string;
  location: string;
  description: string;
  requiredSkills: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  status: JobStatus;
  employmentType: EmploymentType;
  candidateCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface JobRequest {
  employer: string;
  title: string;
  department: string;
  location: string;
  description: string;
  requiredSkills: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  status: JobStatus;
  employmentType: EmploymentType;
}

export interface Candidate {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  resumeUrl: string;
  notes: string;
  skills: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  lastAssignmentDays: number;
  stage: PipelineStage;
  stageOrder: number;
  jobId: number;
  jobTitle: string;
  talentPool: boolean;
  appliedAt: string;
  updatedAt: string;
}

export interface CandidateRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  resumeUrl: string;
  notes: string;
  skills: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  lastAssignmentDays: number;
  stage: PipelineStage;
  jobId: number;
}

export interface StageMoveRequest {
  newStage: PipelineStage;
  newOrder?: number;
}

export interface TopCandidateMatch {
  candidateId: number;
  firstName: string;
  lastName: string;
  email: string;
  skillsMatchPercent: number;
  daysWorkedScore: number;
  distanceMiles: number;
  matchedSkills: string[];
  candidateSkills: string[];
}

export interface DashboardStats {
  totalJobs: number;
  openJobs: number;
  totalCandidates: number;
  candidatesByStage: Record<string, number>;
  jobsByEmployer: Record<string, number>;
}

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
