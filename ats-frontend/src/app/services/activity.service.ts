import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Activity } from '../models/activity.model';

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly baseUrl = '/api/activities';

  constructor(private readonly http: HttpClient) {}

  recent(limit = 20): Observable<Activity[]> {
    return this.http.get<Activity[]>(this.baseUrl, { params: new HttpParams().set('limit', limit) });
  }

  forCandidate(candidateId: number): Observable<Activity[]> {
    return this.http.get<Activity[]>(this.baseUrl, { params: new HttpParams().set('candidateId', candidateId) });
  }

  forJob(jobId: number): Observable<Activity[]> {
    return this.http.get<Activity[]>(this.baseUrl, { params: new HttpParams().set('jobId', jobId) });
  }
}
