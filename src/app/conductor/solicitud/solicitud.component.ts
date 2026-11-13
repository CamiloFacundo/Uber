import { Component, computed, inject, input, output } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { IonIcon, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cashOutline, close, person, star, timeOutline } from 'ionicons/icons';
import { SolicitudViaje } from '../../core/models/models';
import { ComisionService } from '../../core/services/comision.service';
import { nombreServicio } from '../../shared/categorias';
import { distanciaKm, minutosEnCiudad } from '../../shared/geo';
import { MapaComponent, Punto } from '../../shared/mapa/mapa.component';

const METODOS: Record<string, string> = { efectivo: 'Efectivo', nequi: 'Nequi', daviplata: 'Daviplata', tarjeta: 'Tarjeta' };

/**
 * Tarjeta "Nueva solicitud": mapa con el recorrido, tiempo para responder, a cuánto está la recogida,
 * lo que gana el conductor y los botones Rechazar / Aceptar.
 */
@Component({
  selector: 'app-solicitud',
  imports: [CurrencyPipe, DecimalPipe, IonIcon, IonSpinner, MapaComponent],
  template: `
    <article class="solicitud" aria-labelledby="titulo-solicitud" aria-live="polite">
      <div class="mapa">
        <app-mapa [origen]="origen()" [destino]="destino()" [yo]="yo()"></app-mapa>
      </div>

      <div class="cuerpo">
        <header class="cabeza">
          <div>
            <h2 id="titulo-solicitud">Nueva solicitud</h2>
            <span class="servicio">{{ servicio() }}</span>
          </div>
          <div class="reloj" [class.urgente]="restante() <= 5" role="timer" [attr.aria-label]="'Responde en ' + restante() + ' segundos'">
            <svg viewBox="0 0 44 44" aria-hidden="true">
              <circle cx="22" cy="22" r="19" class="pista" />
              <circle cx="22" cy="22" r="19" class="avance" [attr.stroke-dashoffset]="desfase()" />
            </svg>
            <strong>{{ restante() }}</strong>
          </div>
        </header>
        <p class="responde">Responde en {{ restante() }} s</p>

        <div class="ruta">
          <div class="parada">
            <span class="punto origen" aria-hidden="true"></span>
            <div>
              <span class="rotulo">Recoger en{{ recogida() ? ', a ' + (recogida()!.km | number: '1.1-1') + ' km' : '' }}</span>
              <p>{{ solicitud().origin_name }}</p>
            </div>
          </div>
          <div class="parada">
            <span class="punto destino" aria-hidden="true"></span>
            <div>
              <span class="rotulo">Destino</span>
              <p>{{ solicitud().destination_name }}</p>
            </div>
          </div>
        </div>

        <dl class="cifras">
          <div>
            <dt>Viaje</dt>
            <dd>{{ solicitud().estimated_distance_km | number: '1.1-1' }} km</dd>
          </div>
          <div>
            <dt>Duración</dt>
            <dd>{{ solicitud().estimated_duration_min ?? '—' }} min</dd>
          </div>
          <div>
            <dt>Llegas en</dt>
            <dd>{{ recogida() ? recogida()!.min + ' min' : '—' }}</dd>
          </div>
        </dl>

        <div class="pago">
          <div>
            <span>Pago estimado</span>
            <strong>{{ solicitud().estimated_fare | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</strong>
          </div>
          <div class="neto">
            <span>Tu ganancia</span>
            <strong>{{ neto() | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</strong>
          </div>
        </div>

        <p class="pasajero">
          <ion-icon name="person" aria-hidden="true"></ion-icon>
          {{ solicitud().client?.name ?? 'Pasajero' }}
          <span class="separador" aria-hidden="true"></span>
          <ion-icon name="cash-outline" aria-hidden="true"></ion-icon>
          {{ metodo() }}
        </p>

        <div class="botones">
          <button type="button" class="rechazar" [disabled]="procesando()" (click)="rechazar.emit()">
            <ion-icon name="close" aria-hidden="true"></ion-icon> Rechazar
          </button>
          <button type="button" class="aceptar" [disabled]="procesando()" (click)="aceptar.emit()">
            @if (procesando()) {
              <ion-spinner name="crescent"></ion-spinner>
            } @else {
              Aceptar
            }
          </button>
        </div>
        @if (cola() > 0) {
          <p class="cola">{{ cola() === 1 ? 'Hay 1 solicitud más en espera' : 'Hay ' + cola() + ' solicitudes más en espera' }}</p>
        }
      </div>
    </article>
  `,
  styleUrls: ['solicitud.component.scss'],
})
export class SolicitudComponent {
  private comision = inject(ComisionService);

  solicitud = input.required<SolicitudViaje>();
  restante = input(15);
  total = input(15);
  yo = input<Punto | null>(null);
  cola = input(0);
  procesando = input(false);

  aceptar = output<void>();
  rechazar = output<void>();

  readonly circunferencia = 2 * Math.PI * 19;
  desfase = computed(() => this.circunferencia * (1 - this.restante() / this.total()));

  origen = computed(() => punto(this.solicitud(), 'origin'));
  destino = computed(() => punto(this.solicitud(), 'destination'));
  servicio = computed(() => nombreServicio(this.solicitud().service_type));
  metodo = computed(() => METODOS[this.solicitud().payment_method ?? ''] ?? 'Efectivo');
  neto = computed(() => this.comision.desglose(Number(this.solicitud().estimated_fare)).neto);

  /** Distancia y minutos desde la posición del conductor hasta la recogida (si hay GPS) */
  recogida = computed(() => {
    const yo = this.yo();
    const o = this.origen();
    if (!yo || !o) return null;
    const km = distanciaKm(yo, o) * 1.3; // las calles no van en línea recta
    return { km, min: minutosEnCiudad(km) };
  });

  constructor() {
    addIcons({ cashOutline, close, person, star, timeOutline });
  }
}

function punto(s: SolicitudViaje, cual: 'origin' | 'destination'): Punto | null {
  const lat = Number(s[`${cual}_latitude`]);
  const lng = Number(s[`${cual}_longitude`]);
  return lat && lng ? { lat, lng } : null;
}
