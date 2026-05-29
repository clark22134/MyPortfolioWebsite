import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NoteService } from './note.service';
import { Note } from '../models/ats.models';

describe('NoteService', () => {
  let service: NoteService;
  let httpMock: HttpTestingController;

  const note: Note = {
    id: 1, candidateId: 10, authorId: 1, authorName: 'Rec',
    body: 'Great fit', createdAt: '2026-01-01', updatedAt: '2026-01-01'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(NoteService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists notes for a candidate', () => {
    service.listForCandidate(10).subscribe(notes => expect(notes.length).toBe(1));
    httpMock.expectOne('/api/notes?candidateId=10').flush([note]);
  });

  it('creates a note', () => {
    service.create({ candidateId: 10, body: 'x' }).subscribe(n => expect(n.id).toBe(1));
    const r = httpMock.expectOne('/api/notes');
    expect(r.request.method).toBe('POST');
    expect(r.request.body).toEqual({ candidateId: 10, body: 'x' });
    r.flush(note);
  });

  it('deletes a note', () => {
    service.delete(1).subscribe();
    const r = httpMock.expectOne('/api/notes/1');
    expect(r.request.method).toBe('DELETE');
    r.flush(null);
  });
});
