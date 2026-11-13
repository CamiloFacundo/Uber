import { Routes } from '@angular/router';
import { ConductorTabsPage } from './conductor-tabs.page';

/** Módulo CONDUCTOR (AUREN Driver): inicio, viajes, mapa, perfil y ganancias */
export const CONDUCTOR_ROUTES: Routes = [
  {
    path: '',
    component: ConductorTabsPage,
    children: [
      { path: 'inicio', loadComponent: () => import('./inicio/inicio.page').then((m) => m.ConductorInicioPage) },
      { path: 'viajes', loadComponent: () => import('./viajes/viajes.page').then((m) => m.ConductorViajesPage) },
      { path: 'mapa', loadComponent: () => import('./mapa/mapa.page').then((m) => m.ConductorMapaPage) },
      { path: 'perfil', loadComponent: () => import('./perfil/perfil.page').then((m) => m.ConductorPerfilPage) },
      { path: 'ganancias', loadComponent: () => import('./ganancias/ganancias.page').then((m) => m.ConductorGananciasPage) },
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
    ],
  },
];
