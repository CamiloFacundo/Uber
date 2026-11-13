import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { IonContent, IonIcon, IonLabel, IonSegment, IonSegmentButton } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { carSportOutline } from 'ionicons/icons';
import { ComisionService } from '../../core/services/comision.service';
import { ConductorService } from '../../core/services/conductor.service';
import { nombreServicio } from '../../shared/categorias';

type Filtro = 'hoy' | 'semana' | 'todos';

/**
 * Historial de viajes del conductor: cada viaje con su recorrido, lo cobrado y la ganancia neta.
 * Se arma con los viajes finalizados en este dispositivo (la API no tiene historial del conductor).
 */
@Component({
  selector: 'app-conductor-viajes',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, IonContent, IonIcon, IonSegment, IonSegmentButton, IonLabel],
  template: `
    <ion-content class="viajes" [fullscreen]="true">
      <div class="pagina">
        <h1>Historial de viajes</h1>

        <ion-segment [value]="filtro()" (ionChange)="filtro.set($any($event.detail.value))">
          <ion-segment-button value="hoy"><ion-label>Hoy</ion-label></ion-segment-button>
          <ion-segment-button value="semana"><ion-label>7 días</ion-label></ion-segment-button>
          <ion-segment-button value="todos"><ion-label>Todos</ion-label></ion-segment-button>
        </ion-segment>

        @if (lista().length) {
          <p class="conteo">
            {{ lista().length }} {{ lista().length === 1 ? 'viaje' : 'viajes' }} ·
            ganaste {{ totalNeto() | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}
          </p>
        }

        <ul class="lista">
          @for (t of lista(); track t.id) {
            <li class="viaje">
              <div class="cabeza">
                <span class="fecha">{{ t.fecha | date: "EEE d 'de' MMM, h:mm a" }}</span>
                <span class="servicio">{{ servicio(t.servicio) }}</span>
              </div>
              <div class="tramo">
                <p><span class="punto origen" aria-hidden="true"></span>{{ t.origen || 'Origen' }}</p>
                <p><span class="punto destino" aria-hidden="true"></span>{{ t.destino || 'Destino' }}</p>
              </div>
              <div class="pie">
                <span>{{ t.km | number: '1.1-1' }} km{{ t.minutos ? ' · ' + t.minutos + ' min' : '' }}{{ t.pasajero ? ' · ' + t.pasajero : '' }}</span>
                <span class="montos">
                  <small>{{ t.tarifa | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</small>
                  <strong>{{ comision.desglose(t.tarifa).neto | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</strong>
                </span>
              </div>
            </li>
          } @empty {
            <li class="vacio">
              <ion-icon name="car-sport-outline" aria-hidden="true"></ion-icon>
              <strong>{{ filtro() === 'todos' ? 'Aún no tienes viajes' : 'Sin viajes en este periodo' }}</strong>
              <span>Los viajes que finalices aparecerán aquí con lo que ganaste en cada uno.</span>
            </li>
          }
        </ul>
        <p class="nota">Valor cobrado arriba, tu ganancia neta (tras la comisión de {{ comision.porcentaje() }}%) en dorado.</p>
      </div>
    </ion-content>
  `,
  styles: `
    ion-content.viajes { --background: var(--rd-fondo); }
    h1, p { margin: 0; }
    .pagina {
      display: flex; flex-direction: column; gap: 16px; max-width: 640px; margin: 0 auto;
      padding: calc(env(safe-area-inset-top) + 18px) 18px 24px;
    }
    h1 { font-size: 26px; font-weight: 700; }
    .conteo { font-size: 14px; color: var(--rd-suave); }
    .lista { display: flex; flex-direction: column; gap: 10px; margin: 0; padding: 0; list-style: none; }
    .viaje { display: flex; flex-direction: column; gap: 10px; padding: 14px 16px; border-radius: 18px; background: var(--rd-superficie); }
    .cabeza, .pie { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .fecha { display: inline-block; font-size: 13px; color: var(--rd-suave); }
    .fecha::first-letter { text-transform: uppercase; }
    .servicio { padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; color: var(--rd-primario-texto); background: var(--rd-primario-suave); }
    .tramo { display: flex; flex-direction: column; gap: 6px; }
    .tramo p { display: flex; align-items: center; gap: 10px; font-weight: 600; }
    .punto { flex: none; width: 10px; height: 10px; }
    .punto.origen { border-radius: 50%; border: 3px solid var(--rd-rio); }
    .punto.destino { border-radius: 2px; background: var(--rd-sol); }
    .pie > span:first-child { font-size: 13px; color: var(--rd-suave); }
    .montos { display: flex; flex-direction: column; align-items: flex-end; }
    .montos small { font-size: 12px; color: var(--rd-suave); }
    .montos strong { font-family: var(--rd-titulos); font-size: 17px; color: var(--rd-cta); }
    .vacio { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 36px 20px; text-align: center; border-radius: 18px; background: var(--rd-superficie); }
    .vacio ion-icon { font-size: 40px; color: var(--rd-primario); }
    .vacio span { font-size: 14px; color: var(--rd-suave); }
    .nota { font-size: 12px; color: var(--rd-suave); }
  `,
})
export class ConductorViajesPage {
  private conductor = inject(ConductorService);
  comision = inject(ComisionService);

  filtro = signal<Filtro>('todos');

  lista = computed(() => {
    const todos = this.conductor.terminados();
    if (this.filtro() === 'todos') return todos;
    const desde = new Date();
    desde.setHours(0, 0, 0, 0);
    if (this.filtro() === 'semana') desde.setDate(desde.getDate() - 6);
    return todos.filter((t) => new Date(t.fecha) >= desde);
  });
  totalNeto = computed(() => this.comision.desglose(this.lista().reduce((s, t) => s + t.tarifa, 0)).neto);

  constructor() {
    addIcons({ carSportOutline });
  }

  servicio(id: string | undefined): string {
    return id ? nombreServicio(id) : 'Viaje';
  }
}
