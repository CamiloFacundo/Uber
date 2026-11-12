import { Routes } from '@angular/router';
import { ClienteTabsPage } from './cliente-tabs.page';

/** Módulo CLIENTE: /cliente/inicio, /cliente/historial, /cliente/perfil */
export const CLIENTE_ROUTES: Routes = [
  {
    path: '',
    component: ClienteTabsPage,
    children: [
      { path: 'inicio', loadComponent: () => import('./inicio/inicio.page').then((m) => m.ClienteInicioPage) },
      { path: 'historial', loadComponent: () => import('./historial/historial.page').then((m) => m.ClienteHistorialPage) },
      { path: 'perfil', loadComponent: () => import('../shared/perfil/perfil.page').then((m) => m.PerfilPage) },
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
    ],
  },
];
