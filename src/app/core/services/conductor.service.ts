import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { SolicitudViaje, Viaje } from '../models/models';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

/** Viaje que el conductor está atendiendo, con los datos de la solicitud que aceptó. */
export interface ViajeEnCurso {
  viaje: Viaje;
  solicitud: SolicitudViaje;
}

/** Viaje terminado, guardado en el dispositivo para el resumen de ganancias. */
export interface ViajeTerminado {
  id: number;
  fecha: string; // ISO
  tarifa: number;
  km: number;
  origen: string;
  destino: string;
}

/**
 * Endpoints del módulo conductor: /api/driver/* (token con rol driver y conductor aprobado).
 * La API no tiene un endpoint para consultar "mi viaje actual", así que el viaje aceptado
 * se guarda en localStorage para no perderlo si se recarga la app.
 * Tampoco hay endpoint de historial ni de ganancias del conductor: cada viaje que finaliza
 * se guarda en el dispositivo (por conductor) para mostrar el resumen.
 */
@Injectable({ providedIn: 'root' })
export class ConductorService {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  private _enCurso = signal<ViajeEnCurso | null>(this.leer());
  enCurso = this._enCurso.asReadonly();

  private version = signal(0);
  /** Viajes terminados por el conductor que tiene la sesión, del más reciente al más antiguo. */
  terminados = computed(() => {
    this.auth.usuario(); // se recalcula al cambiar de usuario
    this.version(); // y cada vez que termina un viaje
    return this.leerTerminados();
  });

  // PUT /driver/availability  { status }   (403 si el admin no lo ha aprobado)
  cambiarDisponibilidad(disponible: boolean): Observable<string> {
    const status = disponible ? 'available' : 'unavailable';
    return this.api
      .put<{ availability_status: string }>('driver/availability', { status })
      .pipe(map((r) => r.availability_status));
  }

  // GET /driver/ride-requests
  solicitudes(): Observable<SolicitudViaje[]> {
    return this.api.get<{ requests: SolicitudViaje[] }>('driver/ride-requests').pipe(map((r) => r.requests ?? []));
  }

  // POST /driver/ride-requests/{id}/accept   (409 si otro conductor la tomó primero)
  aceptar(solicitud: SolicitudViaje): Observable<Viaje> {
    return this.api.post<{ trip: Viaje }>(`driver/ride-requests/${solicitud.id}/accept`, {}).pipe(
      map((r) => r.trip),
      tap((viaje) => this.guardar({ viaje, solicitud })),
    );
  }

  // POST /driver/trips/{id}/arrive
  llegue(id: number): Observable<Viaje> {
    return this.accion(id, 'arrive');
  }

  // POST /driver/trips/{id}/start
  iniciar(id: number): Observable<Viaje> {
    return this.accion(id, 'start');
  }

  // POST /driver/trips/{id}/complete  { actual_distance_km, actual_duration_min }
  completar(id: number, actual_distance_km: number, actual_duration_min: number): Observable<Viaje> {
    return this.api
      .post<{ trip: Viaje }>(`driver/trips/${id}/complete`, { actual_distance_km, actual_duration_min })
      .pipe(
        map((r) => r.trip),
        tap((viaje) => {
          this.registrarTerminado(viaje, actual_distance_km);
          this.guardar(null);
        }),
      );
  }

  // POST /driver/location  { latitude, longitude, heading, speed, trip_id }
  enviarUbicacion(pos: { latitude: number; longitude: number; heading?: number | null; speed?: number | null }, tripId?: number): Observable<unknown> {
    return this.api.post('driver/location', { ...pos, trip_id: tripId });
  }

  /** Si el viaje ya no existe en el servidor (ej. el cliente canceló), se descarta localmente. */
  descartarEnCurso(): void {
    this.guardar(null);
  }

  private accion(id: number, accion: 'arrive' | 'start'): Observable<Viaje> {
    return this.api.post<{ trip: Viaje }>(`driver/trips/${id}/${accion}`, {}).pipe(
      map((r) => r.trip),
      tap((parcial) => {
        const actual = this._enCurso();
        if (actual) this.guardar({ ...actual, viaje: { ...actual.viaje, ...parcial } });
      }),
    );
  }

  private registrarTerminado(viaje: Viaje, km: number): void {
    const s = this._enCurso()?.solicitud;
    const nuevo: ViajeTerminado = {
      id: viaje.id,
      fecha: viaje.completed_at ?? new Date().toISOString(),
      tarifa: Number(viaje.final_fare ?? viaje.estimated_fare ?? s?.estimated_fare ?? 0),
      km,
      origen: s?.origin_name ?? '',
      destino: s?.destination_name ?? '',
    };
    const lista = [nuevo, ...this.leerTerminados().filter((t) => t.id !== nuevo.id)].slice(0, 200);
    try {
      localStorage.setItem(this.claveTerminados(), JSON.stringify(lista));
    } catch { /* sin almacenamiento */ }
    this.version.update((v) => v + 1);
  }

  private leerTerminados(): ViajeTerminado[] {
    try {
      const v = localStorage.getItem(this.claveTerminados());
      return v ? (JSON.parse(v) as ViajeTerminado[]) : [];
    } catch {
      return [];
    }
  }

  private claveTerminados(): string {
    return `viajes_conductor_${this.auth.usuario()?.id ?? 'anonimo'}`;
  }

  private guardar(valor: ViajeEnCurso | null): void {
    this._enCurso.set(valor);
    try {
      if (valor) localStorage.setItem('viaje_conductor', JSON.stringify(valor));
      else localStorage.removeItem('viaje_conductor');
    } catch { /* sin almacenamiento */ }
  }

  private leer(): ViajeEnCurso | null {
    try {
      const v = localStorage.getItem('viaje_conductor');
      return v ? (JSON.parse(v) as ViajeEnCurso) : null;
    } catch {
      return null;
    }
  }
}
