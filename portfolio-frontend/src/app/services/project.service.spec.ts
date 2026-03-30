import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProjectService } from './project.service';
import { Project } from '../models/project.model';

describe('ProjectService', () => {
  let service: ProjectService;
  let httpMock: HttpTestingController;

  const mockProjects: Project[] = [
    {
      id: 1,
      title: 'Portfolio Website',
      description: 'A modern portfolio website',
      technologies: ['Angular', 'Spring Boot', 'AWS'],
      imageUrl: '/images/portfolio.jpg',
      githubUrl: 'https://github.com/user/portfolio',
      featured: true
    },
    {
      id: 2,
      title: 'E-commerce Platform',
      description: 'An online shopping platform',
      technologies: ['React', 'Node.js', 'MongoDB'],
      imageUrl: '/images/ecommerce.jpg',
      featured: false
    }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProjectService]
    });
    service = TestBed.inject(ProjectService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAllProjects', () => {
    it('should retrieve all projects', () => {
      service.getAllProjects().subscribe(projects => {
        expect(projects).toEqual(mockProjects);
        expect(projects.length).toBe(2);
      });

      const req = httpMock.expectOne('/api/projects');
      expect(req.request.method).toBe('GET');
      req.flush(mockProjects);
    });

    it('should handle error when retrieving all projects', () => {
      service.getAllProjects().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(500);
        }
      });

      const req = httpMock.expectOne('/api/projects');
      req.flush('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('getFeaturedProjects', () => {
    it('should retrieve only featured projects', () => {
      const featuredProjects = mockProjects.filter(p => p.featured);

      service.getFeaturedProjects().subscribe(projects => {
        expect(projects).toEqual(featuredProjects);
        expect(projects.length).toBe(1);
        expect(projects[0].featured).toBe(true);
      });

      const req = httpMock.expectOne('/api/projects/featured');
      expect(req.request.method).toBe('GET');
      req.flush(featuredProjects);
    });

    it('should return empty array when no featured projects', () => {
      service.getFeaturedProjects().subscribe(projects => {
        expect(projects).toEqual([]);
        expect(projects.length).toBe(0);
      });

      const req = httpMock.expectOne('/api/projects/featured');
      req.flush([]);
    });
  });

  describe('getProjectById', () => {
    it('should retrieve a specific project by id', () => {
      const projectId = 1;
      const expectedProject = mockProjects[0];

      service.getProjectById(projectId).subscribe(project => {
        expect(project).toEqual(expectedProject);
        expect(project.id).toBe(projectId);
      });

      const req = httpMock.expectOne(`/api/projects/${projectId}`);
      expect(req.request.method).toBe('GET');
      req.flush(expectedProject);
    });

    it('should handle 404 when project not found', () => {
      const projectId = 999;

      service.getProjectById(projectId).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(404);
        }
      });

      const req = httpMock.expectOne(`/api/projects/${projectId}`);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('createProject', () => {
    it('should create a new project', () => {
      const newProject: Project = {
        title: 'New Project',
        description: 'A new project description',
        technologies: ['Vue.js', 'Django'],
        featured: false
      };

      const createdProject: Project = { ...newProject, id: 3 };

      service.createProject(newProject).subscribe(project => {
        expect(project).toEqual(createdProject);
        expect(project.id).toBe(3);
      });

      const req = httpMock.expectOne('/api/projects');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newProject);
      req.flush(createdProject);
    });

    it('should handle validation errors when creating project', () => {
      const invalidProject: Project = {
        title: '',
        description: '',
        technologies: [],
        featured: false
      };

      service.createProject(invalidProject).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(400);
        }
      });

      const req = httpMock.expectOne('/api/projects');
      req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('updateProject', () => {
    it('should update an existing project', () => {
      const projectId = 1;
      const updatedProject: Project = {
        ...mockProjects[0],
        title: 'Updated Portfolio'
      };

      service.updateProject(projectId, updatedProject).subscribe(project => {
        expect(project).toEqual(updatedProject);
        expect(project.title).toBe('Updated Portfolio');
      });

      const req = httpMock.expectOne(`/api/projects/${projectId}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updatedProject);
      req.flush(updatedProject);
    });

    it('should handle errors when updating non-existent project', () => {
      const projectId = 999;
      const updatedProject: Project = mockProjects[0];

      service.updateProject(projectId, updatedProject).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(404);
        }
      });

      const req = httpMock.expectOne(`/api/projects/${projectId}`);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('deleteProject', () => {
    it('should delete a project', () => {
      const projectId = 1;

      service.deleteProject(projectId).subscribe(response => {
        expect(response).toBeNull();
      });

      const req = httpMock.expectOne(`/api/projects/${projectId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('should handle errors when deleting non-existent project', () => {
      const projectId = 999;

      service.deleteProject(projectId).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(404);
        }
      });

      const req = httpMock.expectOne(`/api/projects/${projectId}`);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });
  });
});
