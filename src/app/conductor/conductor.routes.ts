import { Routes } from '@angular/router';
import { ConductorTabsPage } from './conductor-tabs.page';

/** Módulo CONDUCTOR: /conductor/inicio, /conductor/ganancias, /conductor/perfil */
export const CONDUCTOR_ROUTES: Routes = [
  {
    path: '',
    component: ConductorTabsPage,
    children: [
      { path: 'inicio', loadComponent: () => import('./inicio/inicio.page').then((m) => m.ConductorInicioPage) },
      { path: 'ganancias', loadComponent: () => import('./ganancias/ganancias.page').then((m) => m.ConductorGananciasPage) },
      { path: 'perfil', loadComponent: () => import('../shared/perfil/perfil.page').then((m) => m.PerfilPage) },
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
    ],
  },
];
