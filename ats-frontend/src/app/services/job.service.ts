import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Job, JobRequest, JobStatus, TopCandidateMatch } from '../models/ats.models';

@Injectable({ providedIn: 'root' })
export class JobService {
  private readonly baseUrl = '/api/jobs';

  constructor(private readonly http: HttpClient) {}

  getAll(status?: JobStatus, employer?: string): Observable<Job[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    if (employer) {
      params = params.set('employer', employer);
    }
    return this.http.get<Job[]>(this.baseUrl, { params });
  }

  get(id: number): Observable<Job> {
    return this.http.get<Job>(`${this.baseUrl}/${id}`);
  }

  create(job: JobRequest): Observable<Job> {
    return this.http.post<Job>(this.baseUrl, job);
  }

  update(id: number, job: JobRequest): Observable<Job> {
    return this.http.put<Job>(`${this.baseUrl}/${id}`, job);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  getTopCandidates(id: number): Observable<TopCandidateMatch[]> {
    return this.http.get<TopCandidateMatch[]>(`${this.baseUrl}/${id}/top-candidates`);
  }
}
