import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiClient } from './api-client';
import { Job, JobRequest, JobStatus, TopCandidateMatch } from '../models/ats.models';

@Injectable({ providedIn: 'root' })
export class JobService {
  private readonly http = inject(HttpClient);
  private readonly api = ApiClient.of<Job>('/api/jobs');

  getAll(status?: JobStatus, employer?: string): Observable<Job[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    if (employer) params = params.set('employer', employer);
    return this.api.list(params);
  }

  get(id: number): Observable<Job> {
    return this.api.get(id);
  }

  create(job: JobRequest): Observable<Job> {
    return this.api.create(job);
  }

  update(id: number, job: JobRequest): Observable<Job> {
    return this.api.update(id, job);
  }

  delete(id: number): Observable<void> {
    return this.api.delete(id);
  }

  getTopCandidates(id: number): Observable<TopCandidateMatch[]> {
    return this.http.get<TopCandidateMatch[]>(`/api/jobs/${id}/top-candidates`);
  }
}
