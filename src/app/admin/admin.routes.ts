import { Routes } from '@angular/router';
import { AdminTabsPage } from './admin-tabs.page';

/** Módulo ADMINISTRADOR: /admin/panel, /admin/conductores, /admin/viajes, /admin/tarifas, /admin/perfil */
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminTabsPage,
    children: [
      { path: 'panel', loadComponent: () => import('./panel/panel.page').then((m) => m.PanelPage) },
      { path: 'conductores', loadComponent: () => import('./conductores/conductores.page').then((m) => m.ConductoresPage) },
      { path: 'viajes', loadComponent: () => import('./viajes/viajes.page').then((m) => m.AdminViajesPage) },
      { path: 'tarifas', loadComponent: () => import('./tarifas/tarifas.page').then((m) => m.TarifasPage) },
      { path: 'perfil', loadComponent: () => import('../shared/perfil/perfil.page').then((m) => m.PerfilPage) },
      { path: '', redirectTo: 'panel', pathMatch: 'full' },
    ],
  },
];
