import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowDown, arrowUp, carSport, cash, checkmarkCircle, closeCircle, idCard, people, star, warning,
} from 'ionicons/icons';
import { Viaje } from '../../core/models/models';
import { AdminDatosService, conductorDeViaje, fechaViaje, ingresoViaje } from '../../core/services/admin-datos.service';
import { AreaComponent } from '../../shared/graficas/area.component';
import { DonaComponent } from '../../shared/graficas/dona.component';
import { SparklineComponent } from '../../shared/graficas/sparkline.component';
import { MapaComponent, Punto } from '../../shared/mapa/mapa.component';
import { AdminBarraComponent } from '../barra/admin-barra.component';

const DIA = 86400000;
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Dashboard del administrador: indicadores, mapa en tiempo real, actividad, ranking y finanzas. */
@Component({
  selector: 'app-admin-dashboard',
  templateUrl: 'dashboard.page.html',
  styleUrls: ['dashboard.page.scss'],
  imports: [
    CurrencyPipe, DecimalPipe, RouterLink, IonHeader, IonContent, IonIcon, AdminBarraComponent, MapaComponent,
    SparklineComponent, DonaComponent, AreaComponent,
  ],
})
export class AdminDashboardPage {
  datos = inject(AdminDatosService);

  periodo = signal(30);

  private enRango = (desde: number, hasta: number) => (v: Viaje) => {
    const f = fechaViaje(v).getTime();
    return f >= desde && f < hasta;
  };
  private ahora = computed(() => {
    this.datos.ultimaActualizacion(); // se recalcula en cada actualización
    return Date.now();
  });
  delPeriodo = computed(() => this.datos.viajes().filter(this.enRango(this.ahora() - this.periodo() * DIA, this.ahora() + 1)));
  private delPeriodoAnterior = computed(() =>
    this.datos.viajes().filter(this.enRango(this.ahora() - 2 * this.periodo() * DIA, this.ahora() - this.periodo() * DIA)),
  );

  // ---------- Indicadores ----------
  completadosPeriodo = computed(() => this.delPeriodo().filter((v) => v.status === 'completed').length);
  ingresosPeriodo = computed(() => this.delPeriodo().reduce((s, v) => s + ingresoViaje(v), 0));
  pasajerosPeriodo = computed(() => new Set(this.delPeriodo().map((v) => v.client_id ?? v.client?.name)).size);
  enLinea = computed(() => this.datos.conductores().filter((c) => c.availability_status === 'available' && c.approval_status === 'approved').length);

  tendenciaViajes = computed(() =>
    variacion(this.completadosPeriodo(), this.delPeriodoAnterior().filter((v) => v.status === 'completed').length),
  );
  tendenciaIngresos = computed(() =>
    variacion(this.ingresosPeriodo(), this.delPeriodoAnterior().reduce((s, v) => s + ingresoViaje(v), 0)),
  );

  /** Valores por día (o por semana si el periodo es largo) para las minigráficas */
  private grupos = computed(() => {
    const tam = this.periodo() > 31 ? 7 : 1;
    const cantidad = Math.ceil(this.periodo() / tam);
    const inicio = this.ahora() - this.periodo() * DIA;
    const viajes = Array.from({ length: cantidad }, () => 0);
    const ingresos = Array.from({ length: cantidad }, () => 0);
    for (const v of this.delPeriodo()) {
      const i = Math.min(cantidad - 1, Math.floor((fechaViaje(v).getTime() - inicio) / (tam * DIA)));
      if (v.status === 'completed') viajes[i]++;
      ingresos[i] += ingresoViaje(v);
    }
    return { viajes, ingresos };
  });
  sparkViajes = computed(() => this.grupos().viajes);
  sparkIngresos = computed(() => this.grupos().ingresos);

  // ---------- Mapa en tiempo real ----------
  carrosActivos = computed<Punto[]>(() =>
    this.datos.activos()
      .map((v) => v.driver?.latest_location)
      .filter((l): l is { latitude: number; longitude: number } => !!l?.latitude)
      .map((l) => ({ lat: Number(l.latitude), lng: Number(l.longitude) })),
  );
  primerActivo = computed(() => this.datos.activos()[0] ?? null);

  // ---------- Actividad reciente ----------
  actividad = computed(() => {
    const eventos: { icono: string; tono: string; titulo: string; detalle: string; fecha: Date | null }[] = [];
    for (const c of this.datos.pendientes()) {
      eventos.push({ icono: 'id-card', tono: 'oro', titulo: 'Conductor por aprobar', detalle: c.user.name, fecha: null });
    }
    for (const i of this.datos.incidencias()) {
      eventos.push({
        icono: 'warning', tono: 'alerta', titulo: 'Incidencia reportada',
        detalle: `${i.driver ?? 'Conductor'}: ${i.description ?? ''}`, fecha: i.created_at ? new Date(i.created_at) : null,
      });
    }
    for (const v of this.datos.viajes().slice(0, 20)) {
      const ruta = [v.origin_name, v.destination_name].filter(Boolean).join(' → ');
      if (v.status === 'completed') {
        eventos.push({ icono: 'checkmark-circle', tono: 'teal', titulo: 'Viaje completado', detalle: `${ruta}, ${pesos(ingresoViaje(v))}`, fecha: fechaViaje(v) });
      } else if (v.status === 'cancelled') {
        eventos.push({ icono: 'close-circle', tono: 'gris', titulo: 'Viaje cancelado', detalle: ruta, fecha: fechaViaje(v) });
      } else {
        eventos.push({ icono: 'car-sport', tono: 'teal', titulo: 'Viaje en curso', detalle: ruta, fecha: fechaViaje(v) });
      }
    }
    return eventos
      .sort((a, b) => (b.fecha?.getTime() ?? Infinity) - (a.fecha?.getTime() ?? Infinity))
      .slice(0, 6)
      .map((e) => ({ ...e, hace: e.fecha ? hace(e.fecha, this.ahora()) : 'Pendiente' }));
  });

  // ---------- Conductores destacados ----------
  destacados = computed(() => {
    const ganancias = new Map<number, number>();
    const viajes = new Map<number, number>();
    for (const v of this.delPeriodo()) {
      const id = conductorDeViaje(v);
      if (id === undefined || v.status !== 'completed') continue;
      ganancias.set(id, (ganancias.get(id) ?? 0) + ingresoViaje(v));
      viajes.set(id, (viajes.get(id) ?? 0) + 1);
    }
    return this.datos.conductores()
      .filter((c) => c.approval_status === 'approved')
      .map((c) => ({ ...c, ganancias: ganancias.get(c.id) ?? 0, viajes: viajes.get(c.id) ?? 0 }))
      .sort((a, b) => b.ganancias - a.ganancias || b.rating_average - a.rating_average)
      .slice(0, 5);
  });

  // ---------- Distribución y finanzas ----------
  distribucion = computed(() => {
    const p = this.delPeriodo();
    return [
      { etiqueta: 'Completados', valor: p.filter((v) => v.status === 'completed').length, color: 'var(--rd-graf-1)' },
      { etiqueta: 'En curso', valor: p.filter((v) => ['assigned', 'driver_arrived', 'in_progress', 'requested'].includes(v.status)).length, color: 'var(--rd-graf-2)' },
      { etiqueta: 'Cancelados', valor: p.filter((v) => v.status === 'cancelled').length, color: 'var(--rd-graf-3)' },
    ];
  });

  ingresosPorMes = computed(() => {
    const hoy = new Date(this.ahora());
    const meses = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - 5 + i, 1);
      return { clave: `${d.getFullYear()}-${d.getMonth()}`, etiqueta: MESES[d.getMonth()], valor: 0 };
    });
    for (const v of this.datos.viajes()) {
      const f = fechaViaje(v);
      const m = meses.find((x) => x.clave === `${f.getFullYear()}-${f.getMonth()}`);
      if (m) m.valor += ingresoViaje(v);
    }
    return meses.map(({ etiqueta, valor }) => ({ etiqueta, valor }));
  });

  constructor() {
    addIcons({ arrowDown, arrowUp, carSport, cash, checkmarkCircle, closeCircle, idCard, people, star, warning });
  }

  cambiarPeriodo(valor: string): void {
    this.periodo.set(Number(valor));
  }
}

/** Variación porcentual frente al periodo anterior; null si antes no había datos */
function variacion(actual: number, anterior: number): number | null {
  if (!anterior) return null;
  return Math.round(((actual - anterior) / anterior) * 1000) / 10;
}

function pesos(n: number): string {
  return '$ ' + Math.round(n).toLocaleString('es-CO');
}

function hace(fecha: Date, ahora: number): string {
  const min = Math.max(0, Math.round((ahora - fecha.getTime()) / 60000));
  if (min < 1) return 'Hace un momento';
  if (min < 60) return `Hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'Ayer' : `Hace ${d} días`;
}
