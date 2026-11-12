import { Component, computed, inject } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { ConductorService } from '../../core/services/conductor.service';

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/**
 * Ganancias del conductor. La API no tiene historial del conductor, así que se calcula con los
 * viajes que finalizó en este dispositivo (ConductorService.terminados).
 */
@Component({
  selector: 'app-conductor-ganancias',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, IonHeader, IonToolbar, IonTitle, IonContent],
  template: `
    <ion-header>
      <ion-toolbar color="dark"><ion-title>Ganancias</ion-title></ion-toolbar>
    </ion-header>
    <ion-content class="ganancias">
      <div class="contenido">
        <section class="kpis" aria-label="Resumen">
          <div class="kpi">
            <span>Últimos 7 días</span>
            <strong>{{ totalSemana() | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</strong>
          </div>
          <div class="kpi">
            <span>Viajes</span>
            <strong>{{ viajesSemana() }}</strong>
          </div>
          <div class="kpi">
            <span>Kilómetros</span>
            <strong>{{ kmSemana() | number: '1.0-1' }}</strong>
          </div>
        </section>

        <section class="tarjeta">
          <h2>Por día</h2>
          <div class="barras" role="img" aria-label="Gráfica de ganancias de los últimos 7 días">
            @for (d of dias(); track d.clave) {
              <div class="barra" [class.hoy]="d.esHoy">
                <span class="valor">{{ d.total ? (d.total | currency: 'COP' : 'symbol-narrow' : '1.0-0') : '' }}</span>
                <span class="columna" [style.height.%]="d.alto || 2" [class.vacia]="!d.total"></span>
                <span class="dia">{{ d.esHoy ? 'hoy' : d.nombre }}</span>
              </div>
            }
          </div>
          @if (mejorDia(); as m) {
            <p class="nota">Tu mejor día {{ m.esHoy ? 'es hoy' : 'fue el ' + m.nombre }}, con {{ m.total | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}.</p>
          }
        </section>

        <section class="tarjeta">
          <h2>Viajes terminados</h2>
          @for (t of terminados(); track t.id) {
            <div class="viaje">
              <div>
                <strong>{{ t.destino || 'Viaje #' + t.id }}</strong>
                <span>{{ t.fecha | date: "d 'de' MMM, h:mm a" }}{{ t.origen ? ', desde ' + t.origen : '' }}</span>
              </div>
              <strong class="monto">{{ t.tarifa | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</strong>
            </div>
          } @empty {
            <p class="nota">Cuando finalices tu primer viaje, tus ganancias aparecerán aquí.</p>
          }
          <p class="aclaracion">Se cuentan los viajes finalizados en este dispositivo.</p>
        </section>
      </div>
    </ion-content>
  `,
  styles: `
    ion-content.ganancias { --background: var(--rd-fondo); }
    h2, p { margin: 0; }
    .contenido { display: flex; flex-direction: column; gap: 16px; max-width: 760px; margin: 0 auto; padding: 16px; }
    .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .kpi { display: flex; flex-direction: column; gap: 6px; padding: 14px; border-radius: 14px; background: var(--rd-superficie); }
    .kpi span { font-size: 12px; color: var(--rd-suave); }
    .kpi strong { font-size: 19px; font-weight: 700; }
    .tarjeta { padding: 16px; border-radius: 14px; background: var(--rd-superficie); }
    .tarjeta h2 { margin-bottom: 14px; font-size: 16px; font-weight: 700; }
    .barras { display: grid; grid-template-columns: repeat(7, 1fr); align-items: end; gap: 8px; height: 160px; }
    .barra { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 6px; height: 100%; }
    .barra .valor { font-size: 10px; color: var(--rd-suave); white-space: nowrap; }
    .barra .columna { width: 100%; max-width: 32px; border-radius: 6px 6px 2px 2px; background: var(--rd-primario); opacity: 0.55; }
    .barra.hoy .columna { opacity: 1; }
    .barra .columna.vacia { background: var(--rd-linea); opacity: 1; }
    .barra .dia { font-size: 12px; color: var(--rd-suave); }
    .barra.hoy .dia { font-weight: 700; color: var(--rd-tinta); }
    .nota { margin-top: 12px; font-size: 14px; color: var(--rd-suave); }
    .viaje { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 0; border-top: 1px solid var(--rd-linea); }
    .viaje div { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .viaje span { font-size: 13px; color: var(--rd-suave); }
    .monto { flex: none; font-size: 16px; }
    .aclaracion { margin-top: 12px; font-size: 12px; color: var(--rd-suave); }
  `,
})
export class ConductorGananciasPage {
  private conductor = inject(ConductorService);

  terminados = this.conductor.terminados;

  private desde = () => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    d.setHours(0, 0, 0, 0);
    return d;
  };
  private deLaSemana = computed(() => this.terminados().filter((t) => new Date(t.fecha) >= this.desde()));
  totalSemana = computed(() => this.deLaSemana().reduce((s, t) => s + t.tarifa, 0));
  viajesSemana = computed(() => this.deLaSemana().length);
  kmSemana = computed(() => this.deLaSemana().reduce((s, t) => s + t.km, 0));

  dias = computed(() => {
    const hoy = new Date();
    const lista = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 6 + i);
      return { clave: d.toDateString(), nombre: DIAS[d.getDay()], esHoy: i === 6, total: 0 };
    });
    for (const t of this.deLaSemana()) {
      const dia = lista.find((d) => d.clave === new Date(t.fecha).toDateString());
      if (dia) dia.total += t.tarifa;
    }
    const max = Math.max(1, ...lista.map((d) => d.total));
    return lista.map((d) => ({ ...d, alto: Math.round((d.total / max) * 100) }));
  });

  /** Solo tiene sentido comparar si trabajó más de un día. */
  mejorDia = computed(() => {
    const conGanancias = this.dias().filter((d) => d.total > 0);
    if (conGanancias.length < 2) return null;
    return [...conGanancias].sort((a, b) => b.total - a.total)[0];
  });
}
