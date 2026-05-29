import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiClient } from './api-client';
import { Tag, TagRequest } from '../models/tag.model';

@Injectable({ providedIn: 'root' })
export class TagService {
  private readonly http = inject(HttpClient);
  private readonly api = ApiClient.of<Tag>('/api/tags');

  listAll(): Observable<Tag[]> {
    return this.api.list();
  }

  create(request: TagRequest): Observable<Tag> {
    return this.api.create(request);
  }

  update(id: number, request: TagRequest): Observable<Tag> {
    return this.api.update(id, request);
  }

  delete(id: number): Observable<void> {
    return this.api.delete(id);
  }

  tagsForCandidate(candidateId: number): Observable<Tag[]> {
    return this.http.get<Tag[]>(`/api/tags/candidate/${candidateId}`);
  }

  setTagsForCandidate(candidateId: number, tagIds: number[]): Observable<Tag[]> {
    return this.http.put<Tag[]>(`/api/tags/candidate/${candidateId}`, { tagIds });
  }
}
