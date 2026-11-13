import { Routes } from '@angular/router';
import { invitadoGuard, roleGuard } from './core/guards/role.guard';

/**
 * Rutas principales. Cada módulo (admin, conductor, cliente) se carga solo cuando
 * se necesita (lazy loading) y está protegido por el guard de su rol.
 */
export const routes: Routes = [
  {
    path: 'bienvenida',
    canMatch: [invitadoGuard],
    loadComponent: () => import('./auth/bienvenida/bienvenida.page').then((m) => m.BienvenidaPage),
  },
  {
    path: 'login',
    canMatch: [invitadoGuard],
    loadComponent: () => import('./auth/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'registro',
    canMatch: [invitadoGuard],
    loadComponent: () => import('./auth/registro/registro.page').then((m) => m.RegistroPage),
  },
  {
    path: 'recuperar',
    canMatch: [invitadoGuard],
    loadComponent: () => import('./auth/recuperar/recuperar.page').then((m) => m.RecuperarPage),
  },
  {
    path: 'admin',
    canMatch: [roleGuard('admin')],
    loadChildren: () => import('./admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  {
    path: 'conductor',
    canMatch: [roleGuard('driver')],
    loadChildren: () => import('./conductor/conductor.routes').then((m) => m.CONDUCTOR_ROUTES),
  },
  {
    path: 'cliente',
    canMatch: [roleGuard('client')],
    loadChildren: () => import('./cliente/cliente.routes').then((m) => m.CLIENTE_ROUTES),
  },
  { path: '', redirectTo: 'bienvenida', pathMatch: 'full' },
  { path: '**', redirectTo: 'bienvenida' },
];
