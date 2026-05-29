import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Note, NoteRequest } from '../models/note.model';

@Injectable({ providedIn: 'root' })
export class NoteService {
  private readonly baseUrl = '/api/notes';

  constructor(private readonly http: HttpClient) {}

  listForCandidate(candidateId: number): Observable<Note[]> {
    return this.http.get<Note[]>(this.baseUrl, { params: new HttpParams().set('candidateId', candidateId) });
  }

  create(request: NoteRequest): Observable<Note> {
    return this.http.post<Note>(this.baseUrl, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
