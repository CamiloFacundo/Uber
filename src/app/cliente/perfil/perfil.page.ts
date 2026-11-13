import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  cardOutline, checkmarkCircle, chevronForward, headsetOutline, homeOutline, logOutOutline, pricetagOutline,
  settingsOutline,
} from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import { UiService } from '../../core/services/ui.service';

/** Pestaña Perfil del pasajero: datos de la cuenta y menú de opciones. */
@Component({
  selector: 'app-cliente-perfil',
  imports: [RouterLink, IonHeader, IonToolbar, IonTitle, IonContent, IonIcon],
  template: `
    <ion-header>
      <ion-toolbar color="dark"><ion-title>Mi perfil</ion-title></ion-toolbar>
    </ion-header>
    <ion-content class="perfil">
      <div class="contenido">
        @if (usuario(); as u) {
          <section class="cabeza">
            <span class="avatar" aria-hidden="true">{{ inicial() }}</span>
            <div>
              <h1>{{ u.name }}</h1>
              <p>{{ u.email }}</p>
              @if (u.status === 'active') {
                <span class="insignia"><ion-icon name="checkmark-circle" aria-hidden="true"></ion-icon> Cuenta activa</span>
              }
            </div>
          </section>
        }

        <nav class="menu" aria-label="Opciones de la cuenta">
          @for (o of opciones; track o.texto) {
            <a class="opcion" [routerLink]="o.ruta" [fragment]="o.fragmento">
              <ion-icon [name]="o.icono" aria-hidden="true"></ion-icon>
              <span>{{ o.texto }}</span>
              <ion-icon class="flecha" name="chevron-forward" aria-hidden="true"></ion-icon>
            </a>
          }
          <button type="button" class="opcion salir" (click)="cerrarSesion()">
            <ion-icon name="log-out-outline" aria-hidden="true"></ion-icon>
            <span>Cerrar sesión</span>
          </button>
        </nav>
      </div>
    </ion-content>
  `,
  styles: `
    ion-content.perfil { --background: var(--rd-fondo); }
    h1, p { margin: 0; }
    button, a { font-family: inherit; }
    .contenido { display: flex; flex-direction: column; gap: 16px; max-width: 640px; margin: 0 auto; padding: 16px 16px 32px; }
    .cabeza {
      display: flex; align-items: center; gap: 16px; padding: 18px; border-radius: 18px; color: #f5f2ea;
      background: radial-gradient(90% 120% at 100% 0%, rgba(8, 127, 140, 0.5), transparent 70%), #101827;
    }
    .cabeza h1 { font-size: 19px; font-weight: 700; }
    .cabeza p { margin-top: 2px; font-size: 14px; color: rgba(245, 242, 234, 0.75); }
    .avatar {
      display: grid; place-items: center; flex: none; width: 64px; height: 64px; border-radius: 50%;
      font-family: var(--rd-titulos); font-size: 26px; font-weight: 700; color: #101827; background: #c8a96a;
      box-shadow: 0 0 0 3px #087f8c;
    }
    .insignia {
      display: inline-flex; align-items: center; gap: 6px; margin-top: 8px; padding: 4px 10px; border-radius: 999px;
      font-size: 12px; font-weight: 600; color: #17a9b8; background: rgba(8, 127, 140, 0.18); border: 1px solid rgba(23, 169, 184, 0.4);
    }
    .menu { display: flex; flex-direction: column; border-radius: 18px; overflow: hidden; background: var(--rd-superficie); }
    .opcion {
      display: flex; align-items: center; gap: 14px; min-height: 56px; padding: 0 16px; border: 0;
      border-bottom: 1px solid var(--rd-linea); text-align: left; text-decoration: none; font-size: 15px;
      color: var(--rd-tinta); background: transparent; cursor: pointer;
    }
    .opcion:last-child { border-bottom: 0; }
    .opcion > ion-icon:first-child { font-size: 22px; color: var(--rd-primario); }
    .opcion span { flex: 1; }
    .flecha { font-size: 18px; color: var(--rd-suave); }
    .salir, .salir > ion-icon:first-child { color: var(--rd-alerta); }
    .opcion:focus-visible { outline: 2px solid var(--rd-primario); outline-offset: -2px; }
  `,
})
export class ClientePerfilPage {
  private auth = inject(AuthService);
  private ui = inject(UiService);

  usuario = this.auth.usuario;
  inicial = computed(() => this.usuario()?.name.charAt(0).toUpperCase() ?? '');

  opciones = [
    { texto: 'Mis métodos de pago', icono: 'card-outline', ruta: '/cliente/pagos', fragmento: undefined },
    { texto: 'Mis direcciones', icono: 'home-outline', ruta: '/cliente/direcciones', fragmento: undefined },
    { texto: 'Promociones', icono: 'pricetag-outline', ruta: '/cliente/pagos', fragmento: 'promociones' },
    { texto: 'Ayuda y soporte', icono: 'headset-outline', ruta: '/cliente/ayuda', fragmento: undefined },
    { texto: 'Configuración', icono: 'settings-outline', ruta: '/cliente/configuracion', fragmento: undefined },
  ];

  constructor() {
    addIcons({
      cardOutline, checkmarkCircle, chevronForward, headsetOutline, homeOutline, logOutOutline, pricetagOutline,
      settingsOutline,
    });
  }

  ngOnInit(): void {
    this.auth.refrescarPerfil().subscribe({ error: () => undefined });
  }

  async cerrarSesion(): Promise<void> {
    if (await this.ui.confirmar('Cerrar sesión', '¿Seguro que quieres salir?')) {
      this.auth.logout();
    }
  }
}
