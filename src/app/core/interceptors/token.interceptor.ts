import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Interceptor de todas las peticiones HTTP:
 * - Accept: application/json, para que Laravel devuelva los errores en JSON.
 * - Authorization: Bearer <token> si hay sesión.
 * - Ante un 401 (token vencido o inválido) cierra la sesión local.
 */
export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  return next(req.clone({ setHeaders: headers })).pipe(
    catchError((err: HttpErrorResponse) => {
      const esLogin = req.url.endsWith('/auth/login');
      if (err.status === 401 && !esLogin && auth.estaLogueado()) auth.limpiarSesion();
      return throwError(() => err);
    }),
  );
};
