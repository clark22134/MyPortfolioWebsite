import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivityService } from './activity.service';

describe('ActivityService', () => {
  let service: ActivityService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ActivityService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('recent() defaults to limit=20', () => {
    service.recent().subscribe();
    httpMock.expectOne('/api/activities?limit=20').flush([]);
  });

  it('recent(5) sets limit', () => {
    service.recent(5).subscribe();
    httpMock.expectOne('/api/activities?limit=5').flush([]);
  });

  it('forCandidate uses candidateId param', () => {
    service.forCandidate(10).subscribe();
    httpMock.expectOne('/api/activities?candidateId=10').flush([]);
  });

  it('forJob uses jobId param', () => {
    service.forJob(2).subscribe();
    httpMock.expectOne('/api/activities?jobId=2').flush([]);
  });
});
