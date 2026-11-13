import { Component, computed, inject, input, output } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cashOutline, checkmark } from 'ionicons/icons';
import { ComisionService } from '../../core/services/comision.service';
import { ViajeTerminado } from '../../core/services/conductor.service';

/**
 * "¡Viaje completado!": valor del viaje, comisión de AUREN y lo que gana el conductor.
 * La API no permite que el conductor califique al pasajero, así que aquí solo se cierra el resumen.
 */
@Component({
  selector: 'app-resumen-viaje',
  imports: [CurrencyPipe, DecimalPipe, IonIcon],
  template: `
    <section class="resumen" aria-labelledby="titulo-resumen">
      <span class="sello" aria-hidden="true"><ion-icon name="checkmark"></ion-icon></span>
      <h1 id="titulo-resumen">¡Viaje completado!</h1>
      <p class="sub">{{ viaje().pasajero ? 'Llevaste a ' + viaje().pasajero + ' a su destino' : 'Llevaste al pasajero a su destino' }}</p>

      <div class="tramo">
        <p><span class="rotulo">Desde</span>{{ viaje().origen || '—' }}</p>
        <p><span class="rotulo">Hasta</span>{{ viaje().destino || '—' }}</p>
        <p class="datos">{{ viaje().km | number: '1.1-1' }} km{{ viaje().minutos ? ', ' + viaje().minutos + ' min' : '' }}</p>
      </div>

      <dl class="cuentas">
        <div>
          <dt>Valor del viaje</dt>
          <dd>{{ d().bruto | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</dd>
        </div>
        <div class="resta">
          <dt>Comisión AUREN ({{ comision.porcentaje() }}%)</dt>
          <dd>−{{ d().comision | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</dd>
        </div>
        <div class="total">
          <dt>Tu ganancia</dt>
          <dd>{{ d().neto | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</dd>
        </div>
      </dl>

      @if (cobrarEfectivo()) {
        <p class="cobro">
          <ion-icon name="cash-outline" aria-hidden="true"></ion-icon>
          Cobra al pasajero {{ d().bruto | currency: 'COP' : 'symbol-narrow' : '1.0-0' }} en efectivo
        </p>
      }

      <button type="button" class="volver" (click)="cerrar.emit()">Volver al inicio</button>
    </section>
  `,
  styles: `
    :host { display: block; }
    h1, p, dl, dd { margin: 0; }
    .resumen { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 28px 20px 24px; text-align: center; }
    .sello {
      display: grid; place-items: center; width: 76px; height: 76px; border-radius: 50%; font-size: 40px;
      color: var(--rd-sobre-primario); background: var(--rd-primario); box-shadow: 0 0 0 10px var(--rd-primario-suave);
      animation: aparecer 0.4s ease-out;
    }
    @keyframes aparecer { from { transform: scale(0.6); opacity: 0; } }
    @media (prefers-reduced-motion: reduce) { .sello { animation: none; } }
    h1 { font-size: 26px; font-weight: 700; }
    .sub { margin-top: -8px; color: var(--rd-suave); }
    .tramo, .cuentas { width: 100%; padding: 16px 18px; border-radius: 18px; text-align: left; background: var(--rd-superficie); }
    .tramo { display: flex; flex-direction: column; gap: 10px; }
    .tramo p { font-weight: 600; }
    .rotulo { display: block; font-size: 12px; font-weight: 400; color: var(--rd-suave); }
    .tramo .datos { font-size: 13px; font-weight: 400; color: var(--rd-suave); }
    .cuentas { display: flex; flex-direction: column; gap: 12px; }
    .cuentas div { display: flex; justify-content: space-between; gap: 12px; font-size: 15px; }
    .cuentas dt { color: var(--rd-suave); }
    .cuentas dd { font-weight: 600; font-variant-numeric: tabular-nums; }
    .cuentas .total { padding-top: 12px; border-top: 1px solid var(--rd-linea); }
    .cuentas .total dt { font-weight: 700; color: var(--rd-tinta); }
    .cuentas .total dd { font-family: var(--rd-titulos); font-size: 24px; font-weight: 700; color: var(--rd-cta); }
    .cobro {
      display: flex; align-items: center; gap: 10px; width: 100%; padding: 12px 14px; border-radius: 14px;
      text-align: left; font-size: 14px; background: var(--rd-primario-suave);
    }
    .cobro ion-icon { flex: none; font-size: 22px; color: var(--rd-primario); }
    .volver {
      width: 100%; height: 56px; border: 0; border-radius: 16px; font-family: var(--rd-titulos); font-size: 17px;
      font-weight: 700; color: var(--rd-sobre-cta); background: var(--rd-cta); cursor: pointer;
    }
    .volver:hover { background: var(--rd-cta-hover); }
    .volver:focus-visible { outline: 2px solid var(--rd-primario); outline-offset: 2px; }
  `,
})
export class ResumenViajeComponent {
  comision = inject(ComisionService);

  viaje = input.required<ViajeTerminado>();
  metodoPago = input<string | undefined>(undefined);
  cerrar = output<void>();

  d = computed(() => this.comision.desglose(this.viaje().tarifa));
  cobrarEfectivo = computed(() => (this.metodoPago() ?? 'efectivo') === 'efectivo');

  constructor() {
    addIcons({ cashOutline, checkmark });
  }
}
