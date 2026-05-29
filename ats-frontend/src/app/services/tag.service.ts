import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Tag, TagRequest } from '../models/tag.model';

@Injectable({ providedIn: 'root' })
export class TagService {
  private readonly baseUrl = '/api/tags';

  constructor(private readonly http: HttpClient) {}

  listAll(): Observable<Tag[]> {
    return this.http.get<Tag[]>(this.baseUrl);
  }

  create(request: TagRequest): Observable<Tag> {
    return this.http.post<Tag>(this.baseUrl, request);
  }

  update(id: number, request: TagRequest): Observable<Tag> {
    return this.http.put<Tag>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  tagsForCandidate(candidateId: number): Observable<Tag[]> {
    return this.http.get<Tag[]>(`${this.baseUrl}/candidate/${candidateId}`);
  }

  setTagsForCandidate(candidateId: number, tagIds: number[]): Observable<Tag[]> {
    return this.http.put<Tag[]>(`${this.baseUrl}/candidate/${candidateId}`, { tagIds });
  }
}
