import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { Rol } from '../models/models';
import { AuthService } from '../services/auth.service';

/**
 * Guard por rol para cada módulo: sin sesión redirige al login; con otro rol, al inicio de su módulo.
 */
export function roleGuard(rol: Rol): CanMatchFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const usuario = auth.usuario();

    if (!usuario) return router.parseUrl('/login');
    if (usuario.role !== rol) return router.parseUrl(auth.rutaInicio(usuario.role));
    return true;
  };
}

/** Si ya hay sesión, no deja volver al login: redirige al inicio del rol. */
export const invitadoGuard: CanMatchFn = () => {
  const auth = inject(AuthService);
  const usuario = auth.usuario();
  return usuario ? inject(Router).parseUrl(auth.rutaInicio(usuario.role)) : true;
};
