import { PipelineStage } from './pipeline.model';

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
