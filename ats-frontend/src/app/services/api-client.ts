import { HttpClient, HttpParams } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';

/**
 * Tiny generic REST wrapper that consolidates the list/get/create/update/delete
 * shape every domain service in this app was repeating. Each concrete service
 * still owns its endpoint base URL and its bespoke (non-CRUD) methods; this
 * class only carries the boilerplate.
 *
 * Usage:
 * <pre>
 * @Injectable({ providedIn: 'root' })
 * export class TagService {
 *   private readonly api = ApiClient.of<Tag>('/api/tags');
 *   listAll(): Observable<Tag[]> { return this.api.list(); }
 *   // …
 * }
 * </pre>
 */
export class ApiClient<T> {
  private constructor(
    private readonly http: HttpClient,
    private readonly baseUrl: string
  ) {}

  /** Convenience factory that pulls HttpClient via {@link inject} so services don't need a constructor. */
  static of<T>(baseUrl: string): ApiClient<T> {
    return new ApiClient<T>(inject(HttpClient), baseUrl);
  }

  list(params?: HttpParams): Observable<T[]> {
    return this.http.get<T[]>(this.baseUrl, { params });
  }

  get(id: number | string): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}/${id}`);
  }

  create<R = T>(body: R): Observable<T> {
    return this.http.post<T>(this.baseUrl, body as unknown as object);
  }

  update<R = T>(id: number | string, body: R): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}/${id}`, body as unknown as object);
  }

  patch<R, Resp = T>(path: string, body: R): Observable<Resp> {
    return this.http.patch<Resp>(`${this.baseUrl}${path}`, body as unknown as object);
  }

  delete(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
