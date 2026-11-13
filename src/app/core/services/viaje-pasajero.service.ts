import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Estimacion, Lugar, SolicitudViaje } from '../models/models';
import { TipoServicio } from '../../shared/categorias';
import { Punto } from '../../shared/mapa/mapa.component';
import { ClienteService } from './cliente.service';
import { PagoService } from './pago.service';
import { UiService } from './ui.service';

const CLAVE_RECIENTES = 'destinos_recientes';
const CLAVE_RUTA = 'ruta_viaje_actual';

export interface Ruta {
  origen: Lugar;
  destino: Lugar;
}

/**
 * Estado del viaje del pasajero que comparten las pantallas del recorrido:
 * Inicio (origen y destino) → Selecciona un vehículo (categoría y precio) → Tu viaje en camino.
 */
@Injectable({ providedIn: 'root' })
export class ViajePasajeroService {
  private cliente = inject(ClienteService);
  private pago = inject(PagoService);
  private ui = inject(UiService);

  origen = signal<Lugar | null>(null);
  destino = signal<Lugar | null>(null);
  miPosicion = signal<Punto | null>(null);
  estimacion = signal<Estimacion | null>(null);
  estimando = signal(false);
  categoria = signal<TipoServicio>('eco');
  recientes = signal<Lugar[]>(leer<Lugar[]>(CLAVE_RECIENTES, []));

  /** Origen y destino del viaje pedido (la API no siempre devuelve las coordenadas en /client/active). */
  rutaGuardada = signal<Ruta | null>(leer<Ruta | null>(CLAVE_RUTA, null));

  /** POST /client/estimate-fare con el origen y destino elegidos. */
  estimar(): void {
    const origen = this.origen();
    const destino = this.destino();
    this.estimacion.set(null);
    if (!origen || !destino) return;
    this.estimando.set(true);
    this.cliente.estimar(origen, destino).subscribe({
      next: (e) => {
        this.estimando.set(false);
        this.estimacion.set(e);
      },
      error: (err) => {
        this.estimando.set(false);
        this.ui.error(err);
      },
    });
  }

  /** POST /client/ride-requests con la categoría y el método de pago elegidos. */
  solicitar(): Observable<SolicitudViaje> {
    const origen = this.origen()!;
    const destino = this.destino()!;
    return this.cliente.solicitar(origen, destino, this.categoria(), this.pago.metodo()).pipe(
      tap(() => {
        this.guardarRuta({ origen, destino });
        this.guardarReciente(destino);
        this.destino.set(null);
        this.estimacion.set(null);
      }),
    );
  }

  guardarRuta(ruta: Ruta | null): void {
    this.rutaGuardada.set(ruta);
    escribir(CLAVE_RUTA, ruta);
  }

  private guardarReciente(lugar: Lugar): void {
    const lista = [lugar, ...this.recientes().filter((l) => l.nombre !== lugar.nombre)].slice(0, 5);
    this.recientes.set(lista);
    escribir(CLAVE_RECIENTES, lista);
  }
}

function leer<T>(clave: string, porDefecto: T): T {
  try {
    const v = localStorage.getItem(clave);
    return v ? (JSON.parse(v) as T) : porDefecto;
  } catch {
    return porDefecto;
  }
}

function escribir(clave: string, valor: unknown): void {
  try {
    if (valor === null) localStorage.removeItem(clave);
    else localStorage.setItem(clave, JSON.stringify(valor));
  } catch { /* sin almacenamiento */ }
}
