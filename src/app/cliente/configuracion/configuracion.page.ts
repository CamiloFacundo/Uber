import { Component, inject } from '@angular/core';
import {
  IonBackButton, IonButtons, IonContent, IonHeader, IonLabel, IonSegment, IonSegmentButton, IonTitle, IonToolbar,
} from '@ionic/angular';
import { ModoTema, TemaService } from '../../core/services/tema.service';
import { LogoComponent } from '../../shared/logo/logo.component';

/** Configuración del pasajero: apariencia (oscuro, claro o automático) e información de la app. */
@Component({
  selector: 'app-cliente-configuracion',
  imports: [
    IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonSegment, IonSegmentButton, IonLabel,
    LogoComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="dark">
        <ion-buttons slot="start"><ion-back-button defaultHref="/cliente/perfil" text=""></ion-back-button></ion-buttons>
        <ion-title>Configuración</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="configuracion">
      <div class="contenido">
        <section class="tarjeta">
          <h2>Apariencia</h2>
          <ion-segment [value]="tema.modo()" (ionChange)="cambiar($event.detail.value)">
            <ion-segment-button value="oscuro"><ion-label>Oscuro</ion-label></ion-segment-button>
            <ion-segment-button value="claro"><ion-label>Claro</ion-label></ion-segment-button>
            <ion-segment-button value="sistema"><ion-label>Automático</ion-label></ion-segment-button>
          </ion-segment>
          <p class="nota">AUREN es oscura por defecto. Automático sigue la configuración de tu celular.</p>
        </section>

        <section class="tarjeta acerca">
          <app-logo [alto]="34"></app-logo>
          <p>Tu destino, nuestra prioridad.</p>
          <p class="nota">Proyecto académico, FET 2026</p>
        </section>
      </div>
    </ion-content>
  `,
  styles: `
    ion-content.configuracion { --background: var(--rd-fondo); }
    h2, p { margin: 0; }
    .contenido { display: flex; flex-direction: column; gap: 14px; max-width: 640px; margin: 0 auto; padding: 16px 16px 32px; }
    .tarjeta { display: flex; flex-direction: column; gap: 12px; padding: 16px; border-radius: 18px; background: var(--rd-superficie); }
    .tarjeta h2 { font-size: 17px; font-weight: 700; }
    .nota { font-size: 13px; color: var(--rd-suave); }
    .acerca { align-items: center; text-align: center; }
  `,
})
export class ClienteConfiguracionPage {
  tema = inject(TemaService);

  cambiar(valor: unknown): void {
    this.tema.cambiar(valor as ModoTema);
  }
}
