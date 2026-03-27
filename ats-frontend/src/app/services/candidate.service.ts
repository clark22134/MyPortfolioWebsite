import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Candidate, CandidateRequest, PipelineStage, StageMoveRequest } from '../models/ats.models';

@Injectable({ providedIn: 'root' })
export class CandidateService {
  private readonly baseUrl = '/api/candidates';

  constructor(private readonly http: HttpClient) {}

  getByJob(jobId: number, stage?: PipelineStage): Observable<Candidate[]> {
    let params = new HttpParams().set('jobId', jobId);
    if (stage) {
      params = params.set('stage', stage);
    }
    return this.http.get<Candidate[]>(this.baseUrl, { params });
  }

  get(id: number): Observable<Candidate> {
    return this.http.get<Candidate>(`${this.baseUrl}/${id}`);
  }

  create(candidate: CandidateRequest): Observable<Candidate> {
    return this.http.post<Candidate>(this.baseUrl, candidate);
  }

  update(id: number, candidate: CandidateRequest): Observable<Candidate> {
    return this.http.put<Candidate>(`${this.baseUrl}/${id}`, candidate);
  }

  moveStage(id: number, request: StageMoveRequest): Observable<Candidate> {
    return this.http.patch<Candidate>(`${this.baseUrl}/${id}/stage`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
