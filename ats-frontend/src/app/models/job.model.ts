export type JobStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'ON_HOLD';
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP';

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
