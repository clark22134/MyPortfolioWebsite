import { Activity } from './activity.model';
import { Task } from './task.model';

export interface DashboardStats {
  totalJobs: number;
  openJobs: number;
  totalCandidates: number;
  openTasks: number;
  overdueTasks: number;
  hiredThisMonth: number;
  candidatesByStage: Record<string, number>;
  jobsByEmployer: Record<string, number>;
  recentActivity: Activity[];
  upcomingTasks: Task[];
}
