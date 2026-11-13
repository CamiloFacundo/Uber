import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { IonContent, IonLabel, IonSegment, IonSegmentButton } from '@ionic/angular';
import { ComisionService } from '../../core/services/comision.service';
import { ConductorService, ViajeTerminado } from '../../core/services/conductor.service';
import { Barra, BarrasComponent } from '../../shared/graficas/barras.component';
import { duracion } from '../../shared/tiempo';

type Periodo = 'hoy' | 'semana' | 'mes';
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/**
 * Mis ganancias: Hoy / Semana / Mes con gráfica, viajes, tiempo en línea y el desglose
 * bruto → comisión AUREN → neto. La API no tiene historial ni ganancias del conductor, así que
 * se calcula con los viajes que finalizó en este dispositivo.
 */
@Component({
  selector: 'app-conductor-ganancias',
  imports: [CurrencyPipe, DecimalPipe, IonContent, IonSegment, IonSegmentButton, IonLabel, BarrasComponent],
  template: `
    <ion-content class="ganancias" [fullscreen]="true">
      <div class="pagina">
        <h1>Mis ganancias</h1>

        <ion-segment [value]="periodo()" (ionChange)="periodo.set($any($event.detail.value))">
          <ion-segment-button value="hoy"><ion-label>Hoy</ion-label></ion-segment-button>
          <ion-segment-button value="semana"><ion-label>Semana</ion-label></ion-segment-button>
          <ion-segment-button value="mes"><ion-label>Mes</ion-label></ion-segment-button>
        </ion-segment>

        <section class="total" aria-label="Total del periodo">
          <span>Ganancia neta {{ textoPeriodo() }}</span>
          <strong>{{ resumen().neto | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</strong>
          <small>de {{ resumen().bruto | currency: 'COP' : 'symbol-narrow' : '1.0-0' }} cobrados</small>
        </section>

        <section class="tarjeta">
          <h2>{{ tituloGrafica() }}</h2>
          <app-barras [puntos]="barras()" [titulo]="tituloGrafica()"></app-barras>
        </section>

        <dl class="kpis">
          <div>
            <dt>Viajes</dt>
            <dd>{{ resumen().viajes }}</dd>
          </div>
          <div>
            <dt>Tiempo en línea</dt>
            <dd>{{ duracion(resumen().minutos) }}</dd>
          </div>
          <div>
            <dt>Kilómetros</dt>
            <dd>{{ resumen().km | number: '1.0-1' }}</dd>
          </div>
          <div>
            <dt>Promedio por viaje</dt>
            <dd>{{ resumen().promedio | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</dd>
          </div>
        </dl>

        <section class="tarjeta">
          <h2>Desglose</h2>
          <dl class="desglose">
            <div><dt>Valor de los viajes</dt><dd>{{ resumen().bruto | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</dd></div>
            <div><dt>Comisión AUREN ({{ comision.porcentaje() }}%)</dt><dd>−{{ resumen().comision | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</dd></div>
            <div class="neto"><dt>Tu ganancia</dt><dd>{{ resumen().neto | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</dd></div>
          </dl>
          <p class="nota">
            Se cuentan los viajes finalizados en este dispositivo. La comisión la define el administrador de AUREN.
          </p>
        </section>
      </div>
    </ion-content>
  `,
  styles: `
    ion-content.ganancias { --background: var(--rd-fondo); }
    h1, h2, p, dl, dd { margin: 0; }
    .pagina {
      display: flex; flex-direction: column; gap: 16px; max-width: 640px; margin: 0 auto;
      padding: calc(env(safe-area-inset-top) + 18px) 18px 24px;
    }
    h1 { font-size: 26px; font-weight: 700; }
    .total {
      display: flex; flex-direction: column; gap: 4px; padding: 20px; border-radius: 20px; color: #f5f2ea;
      background: radial-gradient(120% 120% at 100% 0%, rgba(200, 169, 106, 0.28), transparent 55%), linear-gradient(135deg, #087f8c, #0b4f5a 70%, #101827);
    }
    .total span { font-size: 14px; color: rgba(245, 242, 234, 0.8); }
    .total strong { font-family: var(--rd-titulos); font-size: 36px; font-weight: 700; letter-spacing: -0.01em; }
    .total small { font-size: 13px; color: rgba(245, 242, 234, 0.75); }
    .tarjeta { padding: 16px 18px; border-radius: 18px; background: var(--rd-superficie); }
    .tarjeta h2 { font-size: 16px; font-weight: 700; }
    .kpis { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .kpis div { padding: 14px; border-radius: 16px; background: var(--rd-superficie); }
    .kpis dt { font-size: 12px; color: var(--rd-suave); }
    .kpis dd { margin-top: 4px; font-family: var(--rd-titulos); font-size: 20px; font-weight: 700; }
    .desglose { display: flex; flex-direction: column; gap: 12px; margin-top: 14px; }
    .desglose div { display: flex; justify-content: space-between; gap: 12px; font-size: 15px; }
    .desglose dt { color: var(--rd-suave); }
    .desglose dd { font-weight: 600; font-variant-numeric: tabular-nums; }
    .desglose .neto { padding-top: 12px; border-top: 1px solid var(--rd-linea); }
    .desglose .neto dt { font-weight: 700; color: var(--rd-tinta); }
    .desglose .neto dd { font-family: var(--rd-titulos); font-size: 20px; font-weight: 700; color: var(--rd-cta); }
    .nota { margin-top: 14px; font-size: 12px; color: var(--rd-suave); }
  `,
})
export class ConductorGananciasPage {
  private conductor = inject(ConductorService);
  comision = inject(ComisionService);
  duracion = duracion;

  periodo = signal<Periodo>('semana');

  /** Desde cuándo cuenta el periodo elegido */
  private desde = computed(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    if (this.periodo() === 'semana') d.setDate(d.getDate() - 6);
    if (this.periodo() === 'mes') d.setDate(1);
    return d;
  });
  private viajes = computed(() => this.conductor.terminados().filter((t) => new Date(t.fecha) >= this.desde()));

  textoPeriodo = computed(() => ({ hoy: 'de hoy', semana: 'de los últimos 7 días', mes: 'de este mes' })[this.periodo()]);
  tituloGrafica = computed(() => ({ hoy: 'Hoy por horas', semana: 'Últimos 7 días', mes: 'Este mes por semanas' })[this.periodo()]);

  resumen = computed(() => {
    const lista = this.viajes();
    const bruto = suma(lista);
    return {
      ...this.comision.desglose(bruto),
      viajes: lista.length,
      km: lista.reduce((s, t) => s + t.km, 0),
      promedio: lista.length ? bruto / lista.length : 0,
      minutos: this.conductor.minutosEnLinea(this.desde()),
    };
  });

  /** Barras con la ganancia neta: por franjas de 3 h (hoy), por día (semana) o por semana del mes */
  barras = computed<Barra[]>(() => {
    const lista = this.viajes();
    const neto = (v: ViajeTerminado[]) => this.comision.desglose(suma(v)).neto;
    const ahora = new Date();

    if (this.periodo() === 'hoy') {
      return Array.from({ length: 8 }, (_, i) => {
        const h = i * 3;
        return {
          etiqueta: `${h}h`,
          valor: neto(lista.filter((t) => Math.floor(new Date(t.fecha).getHours() / 3) === i)),
          actual: Math.floor(ahora.getHours() / 3) === i,
        };
      });
    }
    if (this.periodo() === 'semana') {
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 6 + i);
        return {
          etiqueta: i === 6 ? 'hoy' : DIAS[d.getDay()],
          valor: neto(lista.filter((t) => new Date(t.fecha).toDateString() === d.toDateString())),
          actual: i === 6,
        };
      });
    }
    // Mes: semana 1 = días 1-7, semana 2 = 8-14...
    const semanas = Math.ceil(new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).getDate() / 7);
    return Array.from({ length: semanas }, (_, i) => ({
      etiqueta: `Sem ${i + 1}`,
      valor: neto(lista.filter((t) => Math.floor((new Date(t.fecha).getDate() - 1) / 7) === i)),
      actual: Math.floor((ahora.getDate() - 1) / 7) === i,
    }));
  });
}

function suma(lista: ViajeTerminado[]): number {
  return lista.reduce((s, t) => s + t.tarifa, 0);
}
