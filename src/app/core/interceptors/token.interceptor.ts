import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Se ejecuta en CADA petición HTTP:
 * 1. Agrega  Accept: application/json  (para que Laravel responda errores en JSON y no en HTML).
 * 2. Agrega  Authorization: Bearer <token>  (igual que en Postman).
 * 3. Si el backend responde 401 (token vencido o inválido), cierra la sesión.
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
