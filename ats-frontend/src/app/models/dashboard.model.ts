export interface DashboardStats {
  totalJobs: number;
  openJobs: number;
  totalCandidates: number;
  candidatesByStage: Record<string, number>;
  jobsByEmployer: Record<string, number>;
}
