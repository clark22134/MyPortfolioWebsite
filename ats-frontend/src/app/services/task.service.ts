import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Task, TaskRequest, TaskStatus } from '../models/task.model';

export interface TaskFilters {
  status?: TaskStatus;
  assigneeId?: number;
  candidateId?: number;
}

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly baseUrl = '/api/tasks';

  constructor(private readonly http: HttpClient) {}

  list(filters: TaskFilters = {}): Observable<Task[]> {
    let params = new HttpParams();
    if (filters.status) params = params.set('status', filters.status);
    if (filters.assigneeId != null) params = params.set('assigneeId', filters.assigneeId);
    if (filters.candidateId != null) params = params.set('candidateId', filters.candidateId);
    return this.http.get<Task[]>(this.baseUrl, { params });
  }

  mine(): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.baseUrl}/mine`);
  }

  get(id: number): Observable<Task> {
    return this.http.get<Task>(`${this.baseUrl}/${id}`);
  }

  create(request: TaskRequest): Observable<Task> {
    return this.http.post<Task>(this.baseUrl, request);
  }

  update(id: number, request: TaskRequest): Observable<Task> {
    return this.http.put<Task>(`${this.baseUrl}/${id}`, request);
  }

  updateStatus(id: number, status: TaskStatus): Observable<Task> {
    return this.http.patch<Task>(`${this.baseUrl}/${id}/status`, { status });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
