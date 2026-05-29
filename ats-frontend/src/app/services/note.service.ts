import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiClient } from './api-client';
import { Note, NoteRequest } from '../models/note.model';

@Injectable({ providedIn: 'root' })
export class NoteService {
  private readonly api = ApiClient.of<Note>('/api/notes');

  listForCandidate(candidateId: number): Observable<Note[]> {
    return this.api.list(new HttpParams().set('candidateId', candidateId));
  }

  create(request: NoteRequest): Observable<Note> {
    return this.api.create(request);
  }

  delete(id: number): Observable<void> {
    return this.api.delete(id);
  }
}
