import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { SolicitudViaje, Usuario, Vehiculo, Viaje } from '../models/models';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

/** Viaje que el conductor está atendiendo, con los datos de la solicitud que aceptó. */
export interface ViajeEnCurso {
  viaje: Viaje;
  solicitud: SolicitudViaje;
  /** Cuándo lo aceptó (para medir cuánto tardó en total) */
  aceptado?: string;
}

/** Viaje terminado, guardado en el dispositivo para el resumen de ganancias. */
export interface ViajeTerminado {
  id: number;
  fecha: string; // ISO
  tarifa: number;
  km: number;
  origen: string;
  destino: string;
  minutos?: number;
  pasajero?: string;
  servicio?: string;
}

/** Datos del conductor que no vienen en "user" (licencia, aprobación, vehículo). */
export interface PerfilConductor {
  license_number?: string;
  approval_status?: string;
  rating_average?: number;
  vehicles?: Vehiculo[];
}

/** Tiempo en línea: desde cuándo está conectado y minutos acumulados por día (AAAA-MM-DD). */
interface TiempoEnLinea {
  desde: number | null;
  porDia: Record<string, number>;
}

/**
 * Endpoints del módulo conductor: /api/driver/* (token con rol driver y conductor aprobado).
 * La API no tiene un endpoint para consultar "mi viaje actual", así que el viaje aceptado
 * se guarda en localStorage para no perderlo si se recarga la app.
 * Tampoco hay endpoint de historial, ganancias ni tiempo en línea del conductor: se registran
 * en el dispositivo (por conductor) para mostrar los resúmenes.
 */
@Injectable({ providedIn: 'root' })
export class ConductorService {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  private _enCurso = signal<ViajeEnCurso | null>(this.leer('viaje_conductor'));
  enCurso = this._enCurso.asReadonly();

  /** La API no tiene un GET de disponibilidad, así que se recuerda en el dispositivo */
  private _disponible = signal(localStorage.getItem('disponible') === '1');
  disponible = this._disponible.asReadonly();

  /** Solicitudes que el conductor rechazó o dejó vencer: no se le vuelven a mostrar en este dispositivo */
  private _rechazadas = signal<Set<number>>(new Set(this.leerSesion<number[]>('rechazadas') ?? []));
  rechazadas = this._rechazadas.asReadonly();

  /** Licencia, aprobación y vehículo (el simulador los devuelve en /auth/me; el backend real puede no hacerlo) */
  perfil = signal<PerfilConductor | null>(null);
  vehiculo = computed<Vehiculo | null>(() => this.perfil()?.vehicles?.[0] ?? this.leer<Vehiculo>(this.claveVehiculo()) ?? null);
  esMoto = computed(() => this.vehiculo()?.type === 'moto');

  private version = signal(0);
  /** Viajes terminados por el conductor que tiene la sesión, del más reciente al más antiguo. */
  terminados = computed(() => {
    this.auth.usuario(); // se recalcula al cambiar de usuario
    this.version(); // y cada vez que termina un viaje
    return this.leer<ViajeTerminado[]>(this.claveTerminados()) ?? [];
  });

  /** Reloj de 1 min para que el tiempo en línea avance en pantalla */
  private minuto = signal(Date.now());
  private tiempo = computed(() => {
    this.auth.usuario();
    this.version();
    return this.leer<TiempoEnLinea>(this.claveTiempo()) ?? { desde: null, porDia: {} };
  });

  constructor() {
    setInterval(() => this.minuto.set(Date.now()), 60000);
  }

  // PUT /driver/availability  { status }   (403 si el admin no lo ha aprobado)
  cambiarDisponibilidad(disponible: boolean): Observable<string> {
    const status = disponible ? 'available' : 'unavailable';
    return this.api.put<{ availability_status: string }>('driver/availability', { status }).pipe(
      map((r) => r.availability_status),
      tap((estado) => this.marcarDisponible(estado === 'available')),
    );
  }

  // GET /auth/me: el simulador agrega "driver" con el vehículo; con el backend real se usa lo guardado al registrarse
  cargarPerfil(): Observable<PerfilConductor | null> {
    return this.api.get<{ user: Usuario; driver?: PerfilConductor }>('auth/me').pipe(
      map((r) => r.driver ?? null),
      tap((p) => {
        if (p) this.perfil.set(p);
      }),
    );
  }

  /** Al registrarse se guarda el vehículo, por si el servidor no lo devuelve después. */
  recordarVehiculo(email: string, v: Vehiculo): void {
    this.escribir(`vehiculo_conductor_${email}`, v);
  }

  // GET /driver/ride-requests
  solicitudes(): Observable<SolicitudViaje[]> {
    return this.api.get<{ requests: SolicitudViaje[] }>('driver/ride-requests').pipe(map((r) => r.requests ?? []));
  }

  /** Rechazar (o dejar vencer) una solicitud: deja de mostrarse. La API no tiene endpoint de rechazo. */
  rechazar(id: number): void {
    this._rechazadas.update((s) => new Set(s).add(id));
    try {
      sessionStorage.setItem('rechazadas', JSON.stringify([...this._rechazadas()].slice(-100)));
    } catch { /* sin almacenamiento */ }
  }

  // POST /driver/ride-requests/{id}/accept   (409 si otro conductor la tomó primero)
  aceptar(solicitud: SolicitudViaje): Observable<Viaje> {
    return this.api.post<{ trip: Viaje }>(`driver/ride-requests/${solicitud.id}/accept`, {}).pipe(
      map((r) => r.trip),
      tap((viaje) => this.guardar({ viaje, solicitud, aceptado: new Date().toISOString() })),
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
  completar(id: number, actual_distance_km: number, actual_duration_min: number): Observable<ViajeTerminado> {
    return this.api
      .post<{ trip: Viaje }>(`driver/trips/${id}/complete`, { actual_distance_km, actual_duration_min })
      .pipe(
        map((r) => {
          const t = this.registrarTerminado(r.trip, actual_distance_km, actual_duration_min);
          this.guardar(null);
          return t;
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

  /** Minutos en línea desde una fecha (incluye la conexión actual si sigue abierta). */
  minutosEnLinea(desde: Date): number {
    const ahora = this.minuto();
    const t = this.tiempo();
    const clave = claveDia(desde);
    let total = Object.entries(t.porDia).filter(([dia]) => dia >= clave).reduce((s, [, m]) => s + m, 0);
    if (t.desde) total += Math.max(0, (ahora - Math.max(t.desde, desde.getTime())) / 60000);
    return Math.round(total);
  }

  private marcarDisponible(valor: boolean): void {
    this._disponible.set(valor);
    try {
      localStorage.setItem('disponible', valor ? '1' : '0');
    } catch { /* sin almacenamiento */ }

    // Tiempo en línea: al conectarse se anota la hora; al desconectarse se suman los minutos al día
    const t = this.tiempo();
    if (valor && !t.desde) {
      t.desde = Date.now();
    } else if (!valor && t.desde) {
      const dia = claveDia(new Date(t.desde));
      t.porDia[dia] = (t.porDia[dia] ?? 0) + (Date.now() - t.desde) / 60000;
      t.desde = null;
    }
    this.escribir(this.claveTiempo(), t);
    this.version.update((v) => v + 1);
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

  private registrarTerminado(viaje: Viaje, km: number, minutos: number): ViajeTerminado {
    const s = this._enCurso()?.solicitud;
    const nuevo: ViajeTerminado = {
      id: viaje.id,
      fecha: viaje.completed_at ?? new Date().toISOString(),
      tarifa: Number(viaje.final_fare ?? viaje.estimated_fare ?? s?.estimated_fare ?? 0),
      km,
      minutos,
      origen: s?.origin_name ?? '',
      destino: s?.destination_name ?? '',
      pasajero: s?.client?.name,
      servicio: s?.service_type,
    };
    const lista = [nuevo, ...this.terminados().filter((t) => t.id !== nuevo.id)].slice(0, 300);
    this.escribir(this.claveTerminados(), lista);
    this.version.update((v) => v + 1);
    return nuevo;
  }

  private claveTerminados(): string {
    return `viajes_conductor_${this.auth.usuario()?.id ?? 'anonimo'}`;
  }

  private claveTiempo(): string {
    return `tiempo_linea_${this.auth.usuario()?.id ?? 'anonimo'}`;
  }

  private claveVehiculo(): string {
    return `vehiculo_conductor_${this.auth.usuario()?.email ?? ''}`;
  }

  private guardar(valor: ViajeEnCurso | null): void {
    this._enCurso.set(valor);
    if (valor) this.escribir('viaje_conductor', valor);
    else localStorage.removeItem('viaje_conductor');
  }

  private escribir(clave: string, valor: unknown): void {
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
    } catch { /* sin almacenamiento */ }
  }

  private leer<T>(clave: string): T | null {
    try {
      const v = localStorage.getItem(clave);
      return v ? (JSON.parse(v) as T) : null;
    } catch {
      return null;
    }
  }

  private leerSesion<T>(clave: string): T | null {
    try {
      const v = sessionStorage.getItem(clave);
      return v ? (JSON.parse(v) as T) : null;
    } catch {
      return null;
    }
  }
}

/** Fecha local como AAAA-MM-DD (se puede comparar como texto) */
function claveDia(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
