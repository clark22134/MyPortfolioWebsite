import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TagService } from './tag.service';
import { Tag } from '../models/ats.models';

describe('TagService', () => {
  let service: TagService;
  let httpMock: HttpTestingController;

  const tag: Tag = { id: 1, name: 'Top Pick', color: '#22c55e' };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(TagService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists tags', () => {
    service.listAll().subscribe(list => expect(list[0].name).toBe('Top Pick'));
    httpMock.expectOne('/api/tags').flush([tag]);
  });

  it('creates, updates, deletes', () => {
    service.create({ name: 'x', color: '#fff' }).subscribe();
    httpMock.expectOne(r => r.method === 'POST' && r.url === '/api/tags').flush(tag);
    service.update(1, { name: 'y' }).subscribe();
    httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/tags/1').flush(tag);
    service.delete(1).subscribe();
    httpMock.expectOne(r => r.method === 'DELETE' && r.url === '/api/tags/1').flush(null);
  });

  it('tagsForCandidate + setTagsForCandidate', () => {
    service.tagsForCandidate(10).subscribe();
    httpMock.expectOne('/api/tags/candidate/10').flush([tag]);
    service.setTagsForCandidate(10, [1, 2]).subscribe();
    const r = httpMock.expectOne('/api/tags/candidate/10');
    expect(r.request.method).toBe('PUT');
    expect(r.request.body).toEqual({ tagIds: [1, 2] });
    r.flush([tag]);
  });
});
