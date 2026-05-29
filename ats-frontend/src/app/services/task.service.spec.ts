import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TaskService } from './task.service';
import { Task } from '../models/ats.models';

describe('TaskService', () => {
  let service: TaskService;
  let httpMock: HttpTestingController;

  const task: Task = {
    id: 1, subject: 'Call', description: '',
    candidateId: 10, candidateName: 'Alice', jobId: 1, jobTitle: 'Eng',
    assigneeId: 1, assigneeName: 'Rec', creatorId: 1, creatorName: 'Rec',
    priority: 'NORMAL', status: 'OPEN',
    dueAt: null, createdAt: '2026-01-01', updatedAt: '2026-01-01', completedAt: null
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(TaskService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists with no filters', () => {
    service.list().subscribe(list => expect(list.length).toBe(1));
    httpMock.expectOne('/api/tasks').flush([task]);
  });

  it('list with filters', () => {
    service.list({ status: 'OPEN', assigneeId: 1, candidateId: 10 }).subscribe();
    const r = httpMock.expectOne(req => req.url === '/api/tasks'
      && req.params.get('status') === 'OPEN'
      && req.params.get('assigneeId') === '1'
      && req.params.get('candidateId') === '10');
    r.flush([]);
  });

  it('mine endpoint', () => {
    service.mine().subscribe();
    httpMock.expectOne('/api/tasks/mine').flush([]);
  });

  it('get / create / update / updateStatus / delete', () => {
    service.get(1).subscribe();
    httpMock.expectOne('/api/tasks/1').flush(task);
    service.create({ subject: 'x' }).subscribe();
    httpMock.expectOne(r => r.method === 'POST' && r.url === '/api/tasks').flush(task);
    service.update(1, { subject: 'y' }).subscribe();
    httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/tasks/1').flush(task);
    service.updateStatus(1, 'DONE').subscribe();
    const status = httpMock.expectOne(r => r.method === 'PATCH' && r.url === '/api/tasks/1/status');
    expect(status.request.body).toEqual({ status: 'DONE' });
    status.flush({ ...task, status: 'DONE' });
    service.delete(1).subscribe();
    httpMock.expectOne(r => r.method === 'DELETE' && r.url === '/api/tasks/1').flush(null);
  });
});
