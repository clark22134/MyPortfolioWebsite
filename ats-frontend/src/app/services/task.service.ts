import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiClient } from './api-client';
import { Task, TaskRequest, TaskStatus } from '../models/task.model';

export interface TaskFilters {
  status?: TaskStatus;
  assigneeId?: number;
  candidateId?: number;
}

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly http = inject(HttpClient);
  private readonly api = ApiClient.of<Task>('/api/tasks');

  list(filters: TaskFilters = {}): Observable<Task[]> {
    let params = new HttpParams();
    if (filters.status) params = params.set('status', filters.status);
    if (filters.assigneeId != null) params = params.set('assigneeId', filters.assigneeId);
    if (filters.candidateId != null) params = params.set('candidateId', filters.candidateId);
    return this.api.list(params);
  }

  mine(): Observable<Task[]> {
    return this.http.get<Task[]>('/api/tasks/mine');
  }

  get(id: number): Observable<Task> {
    return this.api.get(id);
  }

  create(request: TaskRequest): Observable<Task> {
    return this.api.create(request);
  }

  update(id: number, request: TaskRequest): Observable<Task> {
    return this.api.update(id, request);
  }

  updateStatus(id: number, status: TaskStatus): Observable<Task> {
    return this.api.patch(`/${id}/status`, { status });
  }

  delete(id: number): Observable<void> {
    return this.api.delete(id);
  }
}
