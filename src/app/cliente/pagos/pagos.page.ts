import { Component, ElementRef, inject, viewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cardOutline, cashOutline, checkmarkCircle, phonePortraitOutline, pricetagOutline } from 'ionicons/icons';
import { METODOS_PAGO, MetodoPago, PagoService } from '../../core/services/pago.service';
import { UiService } from '../../core/services/ui.service';

/** Pestaña Pagos: método de pago preferido y promociones. */
@Component({
  selector: 'app-cliente-pagos',
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonIcon],
  template: `
    <ion-header>
      <ion-toolbar color="dark"><ion-title>Pagos</ion-title></ion-toolbar>
    </ion-header>
    <ion-content class="pagos">
      <div class="contenido">
        <section class="tarjeta">
          <h2>Mis métodos de pago</h2>
          <p class="nota">Le pagas directamente al conductor al terminar el viaje. AUREN no guarda datos de tarjetas.</p>
          <div class="opciones" role="radiogroup" aria-label="Método de pago">
            @for (m of metodos; track m.id) {
              <button
                type="button"
                class="opcion"
                role="radio"
                [attr.aria-checked]="pago.metodo() === m.id"
                [class.elegida]="pago.metodo() === m.id"
                (click)="elegir(m.id)"
              >
                <span class="icono" aria-hidden="true"><ion-icon [name]="m.icono"></ion-icon></span>
                <span class="texto">
                  <strong>{{ m.nombre }}</strong>
                  <span>{{ m.detalle }}</span>
                </span>
                @if (pago.metodo() === m.id) {
                  <ion-icon class="marca" name="checkmark-circle" aria-hidden="true"></ion-icon>
                }
              </button>
            }
          </div>
        </section>

        <section class="tarjeta" id="promociones" #promociones>
          <h2>Promociones</h2>
          <div class="vacio">
            <ion-icon name="pricetag-outline" aria-hidden="true"></ion-icon>
            <p>No tienes promociones activas. Cuando haya descuentos para tus viajes, aparecerán aquí.</p>
          </div>
        </section>
      </div>
    </ion-content>
  `,
  styles: `
    ion-content.pagos { --background: var(--rd-fondo); }
    h2, p { margin: 0; }
    button { font-family: inherit; }
    .contenido { display: flex; flex-direction: column; gap: 14px; max-width: 640px; margin: 0 auto; padding: 16px 16px 32px; }
    .tarjeta { display: flex; flex-direction: column; gap: 12px; padding: 16px; border-radius: 18px; background: var(--rd-superficie); }
    .tarjeta h2 { font-size: 17px; font-weight: 700; }
    .nota { font-size: 13px; line-height: 1.45; color: var(--rd-suave); }
    .opciones { display: flex; flex-direction: column; gap: 8px; }
    .opcion {
      display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px 14px;
      border: 1.5px solid var(--rd-linea); border-radius: 14px; text-align: left;
      color: var(--rd-tinta); background: var(--rd-superficie); cursor: pointer;
    }
    .opcion.elegida { border-color: var(--rd-cta); box-shadow: 0 0 0 3px rgba(200, 169, 106, 0.2); }
    .opcion:focus-visible { outline: 2px solid var(--rd-primario); outline-offset: 2px; }
    .icono { display: grid; place-items: center; flex: none; width: 40px; height: 40px; border-radius: 10px; font-size: 20px; color: var(--rd-primario); background: var(--rd-primario-suave); }
    .texto { flex: 1; display: flex; flex-direction: column; }
    .texto strong { font-family: var(--rd-titulos); font-size: 15px; }
    .texto span { font-size: 13px; color: var(--rd-suave); }
    .marca { font-size: 22px; color: var(--rd-cta); }
    .vacio { display: flex; align-items: center; gap: 12px; padding: 14px; border: 1px dashed var(--rd-linea); border-radius: 12px; }
    .vacio ion-icon { flex: none; font-size: 26px; color: var(--rd-sol); }
    .vacio p { font-size: 14px; line-height: 1.45; color: var(--rd-suave); }
  `,
})
export class ClientePagosPage {
  private ui = inject(UiService);
  private ruta = inject(ActivatedRoute);
  private contenido = viewChild.required(IonContent);
  private promociones = viewChild.required<ElementRef<HTMLElement>>('promociones');
  pago = inject(PagoService);
  metodos = METODOS_PAGO;

  constructor() {
    addIcons({ cardOutline, cashOutline, checkmarkCircle, phonePortraitOutline, pricetagOutline });
  }

  // ion-content tiene su propio scroll, así que el #promociones del enlace se resuelve a mano
  ionViewDidEnter(): void {
    if (this.ruta.snapshot.fragment === 'promociones') {
      this.contenido().scrollToPoint(0, this.promociones().nativeElement.offsetTop - 16, 400);
    }
  }

  elegir(id: MetodoPago): void {
    this.pago.cambiar(id);
    this.ui.toast(`Pagarás con ${this.pago.actual().nombre}`, 'success');
  }
}
