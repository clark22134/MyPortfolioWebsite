import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Project } from '../models/project.model';

/**
 * Service for managing portfolio projects.
 * Provides CRUD operations for projects displayed on the portfolio.
 */
@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private static readonly API_URL = '/api/projects';

  constructor(private readonly http: HttpClient) {}

  /**
   * Get all projects.
   */
  getAllProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(ProjectService.API_URL);
  }

  /**
   * Get featured projects for homepage display.
   */
  getFeaturedProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(`${ProjectService.API_URL}/featured`);
  }

  /**
   * Get a single project by ID.
   */
  getProjectById(id: number): Observable<Project> {
    return this.http.get<Project>(`${ProjectService.API_URL}/${id}`);
  }

  /**
   * Create a new project. Requires authentication.
   */
  createProject(project: Project): Observable<Project> {
    return this.http.post<Project>(ProjectService.API_URL, project);
  }

  /**
   * Update an existing project. Requires authentication.
   */
  updateProject(id: number, project: Project): Observable<Project> {
    return this.http.put<Project>(`${ProjectService.API_URL}/${id}`, project);
  }

  /**
   * Delete a project. Requires authentication.
   */
  deleteProject(id: number): Observable<void> {
    return this.http.delete<void>(`${ProjectService.API_URL}/${id}`);
  }
}
