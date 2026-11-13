import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Cliente HTTP base: antepone environment.apiUrl a cada ruta. Lo usan todos los servicios de dominio.
 * El token lo agrega token.interceptor.ts.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  get<T>(ruta: string, params?: Record<string, string | number>): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}/${ruta}`, { params: new HttpParams({ fromObject: params ?? {} }) });
  }

  post<T>(ruta: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}/${ruta}`, body);
  }

  put<T>(ruta: string, body: unknown): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}/${ruta}`, body);
  }

  patch<T>(ruta: string, body: unknown): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}/${ruta}`, body);
  }

  delete<T>(ruta: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}/${ruta}`);
  }
}
