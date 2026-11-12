import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, interval, startWith, switchMap } from 'rxjs';
import { IonContent, IonIcon, IonSelect, IonSelectOption, IonSpinner, IonTextarea, IonCheckbox } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  call, carOutline, carSportOutline, closeCircle, diamondOutline, locate, shareSocialOutline, star, starOutline, timeOutline, close,
} from 'ionicons/icons';
import { Estimacion, Lugar, Viaje, ViajeActivo } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { ClienteService } from '../../core/services/cliente.service';
import { UbicacionService } from '../../core/services/ubicacion.service';
import { UiService } from '../../core/services/ui.service';
import { estadoViaje } from '../../shared/estado-viaje';
import { CATEGORIAS, Categoria, TipoServicio, precioCategoria } from '../../shared/categorias';
import { LUGARES } from '../../shared/lugares';
import { MapaComponent, Punto } from '../../shared/mapa/mapa.component';

const CLAVE_RECIENTES = 'destinos_recientes';
const CLAVE_RUTA = 'ruta_viaje_actual';

/**
 * Pantalla principal del pasajero:
 * 1. Escoge origen y destino en la lista, con su GPS o tocando el mapa; el servidor estima la tarifa.
 * 2. Pide el viaje (POST /client/ride-requests).
 * 3. Sigue el viaje en el mapa cada 5 s (GET /client/active): conductor, vehículo y su ubicación.
 * 4. Al terminar, califica al conductor.
 */
@Component({
  selector: 'app-cliente-inicio',
  templateUrl: 'inicio.page.html',
  styleUrls: ['inicio.page.scss'],
  imports: [
    CurrencyPipe, DecimalPipe, FormsModule, IonContent, IonIcon, IonSelect, IonSelectOption, IonSpinner, IonTextarea,
    IonCheckbox, MapaComponent,
  ],
})
export class ClienteInicioPage {
  private auth = inject(AuthService);
  private cliente = inject(ClienteService);
  private gps = inject(UbicacionService);
  private ui = inject(UiService);
  private polling?: Subscription;

  usuario = this.auth.usuario;
  primerNombre = computed(() => this.usuario()?.name.split(' ')[0] ?? '');
  lugares = LUGARES;

  // Selección del viaje
  origen = signal<Lugar | null>(null);
  destino = signal<Lugar | null>(null);
  miPosicion = signal<Punto | null>(null);
  recientes = signal<Lugar[]>(this.leer<Lugar[]>(CLAVE_RECIENTES, []));
  estimacion = signal<Estimacion | null>(null);
  estimando = signal(false);
  enviando = signal(false);
  ubicando = signal(false);

  // Tipo de viaje (Confort, Plus, Premium)
  categorias = CATEGORIAS;
  categoria = signal<TipoServicio>('confort');

  // Viaje en curso
  activo = signal<ViajeActivo | null>(null);
  viaje = computed(() => (this.activo()?.has_active ? (this.activo()!.data ?? null) : null));
  estado = computed(() => estadoViaje(this.viaje()?.status ?? ''));
  puedeCancelar = computed(() => ['requested', 'assigned', 'driver_arrived'].includes(this.viaje()?.status ?? ''));
  private rutaGuardada = signal<{ origen: Lugar; destino: Lugar } | null>(this.leer(CLAVE_RUTA, null));
  nombreOrigen = computed(() => this.viaje()?.origin_name ?? this.rutaGuardada()?.origen.nombre ?? '');
  nombreDestino = computed(() => this.viaje()?.destination_name ?? this.rutaGuardada()?.destino.nombre ?? '');

  // Lo que muestra el mapa
  mapaOrigen = computed<Punto | null>(() => (this.viaje() ? this.rutaGuardada()?.origen ?? null : this.origen()));
  mapaDestino = computed<Punto | null>(() => (this.viaje() ? this.rutaGuardada()?.destino ?? null : this.destino()));
  mapaConductor = computed<Punto | null>(() => {
    const loc = this.viaje()?.driver?.latest_location;
    return loc ? { lat: Number(loc.latitude), lng: Number(loc.longitude) } : null;
  });

  /** Recuadro "Llegada estimada" sobre el mapa. */
  eta = computed(() => {
    const v = this.viaje();
    if (!v) {
      const e = this.estimacion();
      return e ? { titulo: 'Duración del viaje', min: e.duration_min } : null;
    }
    const conductor = this.mapaConductor();
    const meta = v.status === 'in_progress' ? this.mapaDestino() : this.mapaOrigen();
    if (!conductor || !meta || v.status === 'requested') return null;
    // Velocidad promedio en ciudad: 25 km/h
    const min = Math.max(1, Math.round((distanciaKm(conductor, meta) / 25) * 60));
    return { titulo: v.status === 'in_progress' ? 'Llegada al destino' : 'Tu conductor llega en', min };
  });

  // Calificación del viaje que acaba de terminar
  porCalificar = signal<Viaje | null>(null);
  estrellas = signal(0);
  comentario = '';
  incidente = false;

  constructor() {
    addIcons({ call, carOutline, carSportOutline, close, closeCircle, diamondOutline, locate, shareSocialOutline, star, starOutline, timeOutline });
  }

  // ngOnInit: primera carga (al recargar el navegador Ionic no dispara ionViewWillEnter en la primera página).
  ngOnInit(): void {
    this.ionViewWillEnter();
  }

  ionViewWillEnter(): void {
    this.polling?.unsubscribe();
    this.polling = interval(5000)
      .pipe(startWith(0), switchMap(() => this.cliente.activo()))
      .subscribe({
        next: (r) => this.actualizarActivo(r),
        error: (err) => this.ui.error(err),
      });
  }

  ionViewWillLeave(): void {
    this.polling?.unsubscribe();
  }

  // ---------- Elegir origen y destino ----------

  elegirDeLista(cual: 'origen' | 'destino', nombre: string): void {
    const lugar = this.lugares.find((l) => l.nombre === nombre) ?? null;
    this[cual].set(lugar);
    this.estimar();
  }

  /** true si el lugar viene de la lista (se muestra en el selector); false si vino del mapa o del GPS. */
  esDeLista(lugar: Lugar | null): boolean {
    return !!lugar && this.lugares.some((l) => l.nombre === lugar.nombre);
  }

  precio(c: Categoria): number {
    return precioCategoria(this.estimacion()?.estimated_fare ?? 0, c);
  }

  elegirReciente(lugar: Lugar): void {
    this.destino.set(lugar);
    this.estimar();
  }

  /** Tocar el mapa: primero pone el origen, luego el destino (y lo reemplaza si se vuelve a tocar). */
  tocarMapa(p: Punto): void {
    if (this.viaje()) return;
    const lugar: Lugar = { nombre: `Punto en el mapa (${p.lat.toFixed(4)}, ${p.lng.toFixed(4)})`, lat: p.lat, lng: p.lng };
    if (!this.origen()) this.origen.set(lugar);
    else this.destino.set(lugar);
    this.estimar();
  }

  async usarMiUbicacion(): Promise<void> {
    this.ubicando.set(true);
    try {
      const p = await this.gps.actual();
      const yo = { lat: p.latitude, lng: p.longitude };
      this.miPosicion.set(yo);
      if (!this.viaje()) {
        this.origen.set({ nombre: 'Mi ubicación', ...yo });
        this.estimar();
      }
    } catch (e) {
      this.ui.toast((e as Error).message, 'danger');
    } finally {
      this.ubicando.set(false);
    }
  }

  limpiar(cual: 'origen' | 'destino'): void {
    this[cual].set(null);
    this.estimacion.set(null);
  }

  // ---------- Pedir, cancelar, compartir ----------

  pedirViaje(): void {
    const origen = this.origen();
    const destino = this.destino();
    if (!origen || !destino) {
      this.ui.toast('Escoge el origen y el destino', 'danger');
      return;
    }
    this.enviando.set(true);
    this.cliente.solicitar(origen, destino, this.categoria()).subscribe({
      next: (solicitud) => {
        this.enviando.set(false);
        this.guardarRuta({ origen, destino });
        this.guardarReciente(destino);
        this.origen.set(null);
        this.destino.set(null);
        this.estimacion.set(null);
        this.activo.set({ has_active: true, type: 'request', data: { ...solicitud, status: 'requested' } });
        this.ui.toast('Buscando conductores disponibles…', 'success');
      },
      error: (err) => {
        this.enviando.set(false);
        this.ui.error(err);
      },
    });
  }

  async cancelar(): Promise<void> {
    const v = this.viaje();
    if (!v) return;
    const motivo = await this.ui.pedirTexto('Cancelar viaje', 'Motivo (opcional)');
    if (motivo === null) return;
    this.cliente.cancelar(v.id, motivo || 'Cancelado por el pasajero').subscribe({
      next: (mensaje) => {
        this.ui.toast(mensaje, 'success');
        this.activo.set({ has_active: false });
        this.guardarRuta(null);
      },
      error: (err) => this.ui.error(err),
    });
  }

  /** Comparte el viaje por WhatsApp u otra app (o lo copia si el navegador no permite compartir). */
  async compartir(): Promise<void> {
    const v = this.viaje();
    if (!v) return;
    const placa = v.vehicle?.plate ? `, placa ${v.vehicle.plate}` : '';
    const texto = `Voy en un viaje de AUREN con ${v.driver?.user.name ?? 'un conductor'}${placa}. ` +
      `Desde ${v.origin_name ?? this.rutaGuardada()?.origen.nombre ?? ''} hasta ${v.destination_name ?? this.rutaGuardada()?.destino.nombre ?? ''}.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Mi viaje en AUREN', text: texto });
      } else {
        await navigator.clipboard.writeText(texto);
        this.ui.toast('Datos del viaje copiados', 'success');
      }
    } catch { /* el usuario cerró el diálogo de compartir */ }
  }

  telefonoConductor = computed(() => {
    const tel = this.viaje()?.driver?.user.phone;
    return tel ? `tel:${tel}` : null;
  });

  // ---------- Calificar ----------

  enviarCalificacion(): void {
    const v = this.porCalificar();
    if (!v || !this.estrellas()) {
      this.ui.toast('Escoge de 1 a 5 estrellas', 'danger');
      return;
    }
    this.cliente.calificar(v.id, this.estrellas(), this.comentario, this.incidente).subscribe({
      next: (mensaje) => {
        this.ui.toast(mensaje, 'success');
        this.cerrarCalificacion();
      },
      error: (err) => this.ui.error(err),
    });
  }

  cerrarCalificacion(): void {
    this.porCalificar.set(null);
    this.estrellas.set(0);
    this.comentario = '';
    this.incidente = false;
  }

  // ---------- Internos ----------

  /** Si había un viaje en curso y desaparece de /client/active, terminó: se ofrece calificarlo. */
  private actualizarActivo(nuevo: ViajeActivo): void {
    const anterior = this.viaje();
    if (anterior && this.activo()?.type === 'trip' && !nuevo.has_active && anterior.status === 'in_progress') {
      this.porCalificar.set(anterior);
    }
    if (!nuevo.has_active) this.guardarRuta(null);
    // Si el servidor trae coordenadas de la solicitud, se usan para el mapa
    const d = nuevo.data as (Viaje & { origin_latitude?: number; origin_longitude?: number; destination_latitude?: number; destination_longitude?: number }) | undefined;
    if (d?.origin_latitude && d.destination_latitude && !this.rutaGuardada()) {
      this.guardarRuta({
        origen: { nombre: d.origin_name ?? 'Origen', lat: Number(d.origin_latitude), lng: Number(d.origin_longitude) },
        destino: { nombre: d.destination_name ?? 'Destino', lat: Number(d.destination_latitude), lng: Number(d.destination_longitude) },
      });
    }
    this.activo.set(nuevo);
  }

  private estimar(): void {
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

  private guardarReciente(lugar: Lugar): void {
    const lista = [lugar, ...this.recientes().filter((l) => l.nombre !== lugar.nombre)].slice(0, 4);
    this.recientes.set(lista);
    this.escribir(CLAVE_RECIENTES, lista);
  }

  private guardarRuta(ruta: { origen: Lugar; destino: Lugar } | null): void {
    this.rutaGuardada.set(ruta);
    this.escribir(CLAVE_RUTA, ruta);
  }

  private leer<T>(clave: string, porDefecto: T): T {
    try {
      const v = localStorage.getItem(clave);
      return v ? (JSON.parse(v) as T) : porDefecto;
    } catch {
      return porDefecto;
    }
  }

  private escribir(clave: string, valor: unknown): void {
    try {
      if (valor === null) localStorage.removeItem(clave);
      else localStorage.setItem(clave, JSON.stringify(valor));
    } catch { /* sin almacenamiento */ }
  }
}

/** Distancia en km entre dos puntos (fórmula de Haversine). */
function distanciaKm(a: Punto, b: Punto): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
