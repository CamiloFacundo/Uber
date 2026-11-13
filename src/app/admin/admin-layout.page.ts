import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonContent, IonIcon, IonMenu, IonMenuToggle, IonRouterOutlet, IonSplitPane } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  barChartOutline, carSportOutline, cardOutline, gridOutline, helpBuoyOutline, idCardOutline, peopleOutline,
  pricetagOutline, settingsOutline,
} from 'ionicons/icons';
import { AdminDatosService } from '../core/services/admin-datos.service';
import { LogoComponent } from '../shared/logo/logo.component';

/**
 * Estructura del panel de administración: barra lateral fija (en computador) o menú
 * desplegable (en celular) y el área principal que cambia según la sección.
 */
@Component({
  selector: 'app-admin-layout',
  imports: [IonSplitPane, IonMenu, IonContent, IonRouterOutlet, IonMenuToggle, IonIcon, RouterLink, RouterLinkActive, LogoComponent],
  template: `
    <ion-split-pane contentId="admin-principal" when="lg">
      <ion-menu contentId="admin-principal" menuId="admin" class="lateral">
        <ion-content class="lateral-contenido">
          <div class="lateral-caja">
            <div class="marca">
              <app-logo tono="sobre-oscuro" [alto]="36"></app-logo>
              <span>Movilidad inteligente</span>
            </div>

            <nav aria-label="Secciones del administrador">
              @for (s of secciones; track s.ruta) {
                <ion-menu-toggle [autoHide]="false">
                  <a class="enlace" [routerLink]="s.ruta" routerLinkActive="activo" [routerLinkActiveOptions]="{ exact: false }">
                    <ion-icon [name]="s.icono" aria-hidden="true"></ion-icon>
                    <span>{{ s.nombre }}</span>
                    @if (s.ruta === '/admin/conductores' && datos.pendientes().length) {
                      <span class="contador" [attr.aria-label]="datos.pendientes().length + ' por aprobar'">{{ datos.pendientes().length }}</span>
                    }
                    @if (s.ruta === '/admin/soporte' && datos.incidencias().length) {
                      <span class="contador" [attr.aria-label]="datos.incidencias().length + ' incidencias'">{{ datos.incidencias().length }}</span>
                    }
                  </a>
                </ion-menu-toggle>
              }
            </nav>

            <p class="estado-sistema" [class.caido]="!datos.enLinea()">
              <span class="punto" aria-hidden="true"></span>
              {{ datos.enLinea() ? 'Sistema en línea' : 'Sin conexión con el servidor' }}
            </p>
          </div>
        </ion-content>
      </ion-menu>

      <ion-router-outlet id="admin-principal"></ion-router-outlet>
    </ion-split-pane>
  `,
  styles: `
    ion-split-pane { --side-width: 260px; --side-min-width: 260px; --side-max-width: 260px; }
    .lateral { --width: 260px; --background: #0b111d; }
    .lateral-contenido { --background: radial-gradient(120% 40% at 0% 0%, rgba(8, 127, 140, 0.25), transparent 70%), #0b111d; }
    .lateral-caja { display: flex; flex-direction: column; gap: 20px; min-height: 100%; padding: 26px 16px 20px; }
    .marca { display: flex; flex-direction: column; align-items: center; gap: 6px; padding-bottom: 8px; }
    .marca span { font-size: 12px; letter-spacing: 0.04em; color: rgba(245, 242, 234, 0.6); }
    nav { display: flex; flex-direction: column; gap: 4px; }
    .enlace {
      display: flex; align-items: center; gap: 14px; min-height: 46px; padding: 0 14px; border-radius: 12px;
      font-family: var(--rd-titulos); font-size: 15px; font-weight: 500; text-decoration: none;
      color: rgba(245, 242, 234, 0.82);
      transition: background-color 0.15s ease, color 0.15s ease;
    }
    .enlace ion-icon { flex: none; font-size: 21px; }
    .enlace span:first-of-type { flex: 1; }
    .enlace:hover { background: rgba(245, 242, 234, 0.06); color: #f5f2ea; }
    .enlace.activo { color: #101827; font-weight: 700; background: linear-gradient(100deg, #c8a96a, #e2c88f); }
    .enlace:focus-visible { outline: 2px solid #c8a96a; outline-offset: 2px; }
    .contador {
      display: grid; place-items: center; min-width: 22px; height: 22px; padding: 0 6px; border-radius: 11px;
      font-family: var(--rd-letra); font-size: 12px; font-weight: 700; color: #101827; background: #c8a96a;
    }
    .enlace.activo .contador { color: #f5f2ea; background: #101827; }
    .estado-sistema {
      display: flex; align-items: center; gap: 8px; margin: auto 0 0; padding: 0 6px;
      font-size: 13px; color: rgba(245, 242, 234, 0.6);
    }
    .estado-sistema .punto { width: 8px; height: 8px; border-radius: 50%; background: #2ecc71; box-shadow: 0 0 0 3px rgba(46, 204, 113, 0.2); }
    .estado-sistema.caido .punto { background: #ff8a80; box-shadow: 0 0 0 3px rgba(255, 138, 128, 0.2); }
  `,
})
export class AdminLayoutPage {
  datos = inject(AdminDatosService);

  secciones = [
    { nombre: 'Dashboard', ruta: '/admin/dashboard', icono: 'grid-outline' },
    { nombre: 'Usuarios', ruta: '/admin/usuarios', icono: 'people-outline' },
    { nombre: 'Conductores', ruta: '/admin/conductores', icono: 'id-card-outline' },
    { nombre: 'Viajes', ruta: '/admin/viajes', icono: 'car-sport-outline' },
    { nombre: 'Pagos', ruta: '/admin/pagos', icono: 'card-outline' },
    { nombre: 'Reportes', ruta: '/admin/reportes', icono: 'bar-chart-outline' },
    { nombre: 'Promociones', ruta: '/admin/promociones', icono: 'pricetag-outline' },
    { nombre: 'Configuración', ruta: '/admin/configuracion', icono: 'settings-outline' },
    { nombre: 'Soporte', ruta: '/admin/soporte', icono: 'help-buoy-outline' },
  ];

  constructor() {
    addIcons({
      barChartOutline, carSportOutline, cardOutline, gridOutline, helpBuoyOutline, idCardOutline, peopleOutline,
      pricetagOutline, settingsOutline,
    });
  }

  ngOnInit(): void {
    this.datos.iniciar();
  }

  ngOnDestroy(): void {
    this.datos.detener();
  }
}
