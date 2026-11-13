import { Routes } from '@angular/router';
import { AdminLayoutPage } from './admin-layout.page';

/** Módulo ADMINISTRADOR: barra lateral con las secciones del panel. */
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayoutPage,
    children: [
      { path: 'dashboard', loadComponent: () => import('./dashboard/dashboard.page').then((m) => m.AdminDashboardPage) },
      { path: 'usuarios', loadComponent: () => import('./usuarios/usuarios.page').then((m) => m.AdminUsuariosPage) },
      { path: 'conductores', loadComponent: () => import('./conductores/conductores.page').then((m) => m.ConductoresPage) },
      { path: 'viajes', loadComponent: () => import('./viajes/viajes.page').then((m) => m.AdminViajesPage) },
      { path: 'pagos', loadComponent: () => import('./pagos/pagos.page').then((m) => m.AdminPagosPage) },
      { path: 'reportes', loadComponent: () => import('./reportes/reportes.page').then((m) => m.AdminReportesPage) },
      { path: 'promociones', loadComponent: () => import('./promociones/promociones.page').then((m) => m.AdminPromocionesPage) },
      { path: 'configuracion', loadComponent: () => import('./configuracion/configuracion.page').then((m) => m.AdminConfiguracionPage) },
      { path: 'soporte', loadComponent: () => import('./soporte/soporte.page').then((m) => m.AdminSoportePage) },
      // Redirecciones de rutas antiguas
      { path: 'panel', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'tarifas', redirectTo: 'pagos', pathMatch: 'full' },
      { path: 'perfil', redirectTo: 'configuracion', pathMatch: 'full' },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
];
