import { Routes } from '@angular/router';
import { ClienteTabsPage } from './cliente-tabs.page';

/**
 * Módulo PASAJERO.
 * Con barra inferior: /cliente/inicio, /historial, /pagos, /perfil (y desde Perfil: direcciones, ayuda, configuracion).
 * A pantalla completa (sin barra): /cliente/vehiculo y /cliente/viaje.
 */
export const CLIENTE_ROUTES: Routes = [
  { path: 'vehiculo', loadComponent: () => import('./vehiculo/vehiculo.page').then((m) => m.ClienteVehiculoPage) },
  { path: 'viaje', loadComponent: () => import('./viaje/viaje.page').then((m) => m.ClienteViajePage) },
  {
    path: '',
    component: ClienteTabsPage,
    children: [
      { path: 'inicio', loadComponent: () => import('./inicio/inicio.page').then((m) => m.ClienteInicioPage) },
      { path: 'historial', loadComponent: () => import('./historial/historial.page').then((m) => m.ClienteHistorialPage) },
      { path: 'pagos', loadComponent: () => import('./pagos/pagos.page').then((m) => m.ClientePagosPage) },
      { path: 'perfil', loadComponent: () => import('./perfil/perfil.page').then((m) => m.ClientePerfilPage) },
      { path: 'direcciones', loadComponent: () => import('./direcciones/direcciones.page').then((m) => m.ClienteDireccionesPage) },
      { path: 'ayuda', loadComponent: () => import('./ayuda/ayuda.page').then((m) => m.ClienteAyudaPage) },
      {
        path: 'configuracion',
        loadComponent: () => import('./configuracion/configuracion.page').then((m) => m.ClienteConfiguracionPage),
      },
      { path: 'cuenta', redirectTo: 'perfil', pathMatch: 'full' },
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
    ],
  },
];
