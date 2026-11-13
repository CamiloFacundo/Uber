import { Injectable, computed, inject, signal } from '@angular/core';
import { Subscription, forkJoin, interval, startWith, switchMap, catchError, of } from 'rxjs';
import { Conductor, Estadisticas, Tarifa, Viaje } from '../models/models';
import { AdminService, Incidencia } from './admin.service';
import { ComisionService } from './comision.service';

/**
 * Datos del panel de administración, compartidos por todas las secciones.
 * Se cargan juntos y se actualizan cada 15 s mientras el administrador tiene el panel abierto
 * (la API no tiene tiempo real; se consulta de nuevo).
 */
@Injectable({ providedIn: 'root' })
export class AdminDatosService {
  private admin = inject(AdminService);
  private comisiones = inject(ComisionService);
  private suscripcion?: Subscription;

  stats = signal<Estadisticas | null>(null);
  viajes = signal<Viaje[]>([]);
  conductores = signal<Conductor[]>([]);
  tarifas = signal<Tarifa[]>([]);
  incidencias = signal<Incidencia[]>([]);
  cargado = signal(false);
  /** false si la última consulta al servidor falló */
  enLinea = signal(true);
  ultimaActualizacion = signal<Date | null>(null);

  /** Comisión de la plataforma (%), compartida con el módulo del conductor. */
  comision = this.comisiones.porcentaje;

  pendientes = computed(() => this.conductores().filter((c) => c.approval_status === 'pending'));
  activos = computed(() => this.viajes().filter((v) => ['assigned', 'driver_arrived', 'in_progress'].includes(v.status)));

  iniciar(): void {
    if (this.suscripcion) return;
    this.suscripcion = interval(15000)
      .pipe(startWith(0), switchMap(() => this.consultar()))
      .subscribe();
  }

  detener(): void {
    this.suscripcion?.unsubscribe();
    this.suscripcion = undefined;
  }

  /** Vuelve a consultar todo ya (ej. después de aprobar un conductor). */
  actualizar(): void {
    this.consultar().subscribe();
  }

  cambiarComision(valor: number): void {
    this.comisiones.cambiar(valor);
  }

  private consultar() {
    return forkJoin({
      dashboard: this.admin.dashboard(),
      viajes: this.admin.viajes(),
      conductores: this.admin.conductores(),
      tarifas: this.admin.tarifas().pipe(catchError(() => of(this.tarifas()))),
    }).pipe(
      switchMap((r) => {
        this.stats.set(r.dashboard.stats);
        this.incidencias.set(r.dashboard.recent_incidents);
        this.viajes.set(r.viajes);
        this.conductores.set(r.conductores);
        this.tarifas.set(r.tarifas);
        this.cargado.set(true);
        this.enLinea.set(true);
        this.ultimaActualizacion.set(new Date());
        return of(true);
      }),
      catchError(() => {
        this.enLinea.set(false);
        this.cargado.set(true);
        return of(false);
      }),
    );
  }
}

/** Fecha de referencia de un viaje (cuándo terminó o cuándo se pidió) */
export function fechaViaje(v: Viaje): Date {
  return new Date(v.completed_at ?? v.created_at ?? 0);
}

/** Ingreso de un viaje completado */
export function ingresoViaje(v: Viaje): number {
  return v.status === 'completed' ? Number(v.final_fare ?? v.estimated_fare ?? 0) : 0;
}

/** Id del conductor de un viaje, venga en driver_id o dentro de driver */
export function conductorDeViaje(v: Viaje): number | undefined {
  return v.driver_id ?? v.driver?.id;
}
