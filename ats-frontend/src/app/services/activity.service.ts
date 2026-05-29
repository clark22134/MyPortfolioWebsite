import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiClient } from './api-client';
import { Activity } from '../models/activity.model';

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly api = ApiClient.of<Activity>('/api/activities');

  recent(limit = 20): Observable<Activity[]> {
    return this.api.list(new HttpParams().set('limit', limit));
  }

  forCandidate(candidateId: number): Observable<Activity[]> {
    return this.api.list(new HttpParams().set('candidateId', candidateId));
  }

  forJob(jobId: number): Observable<Activity[]> {
    return this.api.list(new HttpParams().set('jobId', jobId));
  }
}
