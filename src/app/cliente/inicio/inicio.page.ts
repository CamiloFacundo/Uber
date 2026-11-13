import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subscription, interval, startWith, switchMap } from 'rxjs';
import { IonContent, IonIcon, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  airplane, arrowForward, briefcase, car, chevronForward, close, home, locate, navigate, notificationsOutline,
  searchOutline, timeOutline, umbrella,
} from 'ionicons/icons';
import { Lugar, ViajeActivo } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { BusquedaService } from '../../core/services/busqueda.service';
import { ClienteService } from '../../core/services/cliente.service';
import { DireccionesService, TipoDireccion } from '../../core/services/direcciones.service';
import { UbicacionService } from '../../core/services/ubicacion.service';
import { UiService } from '../../core/services/ui.service';
import { ViajePasajeroService } from '../../core/services/viaje-pasajero.service';
import { LUGARES } from '../../shared/lugares';
import { LogoComponent } from '../../shared/logo/logo.component';
import { MapaComponent, Punto } from '../../shared/mapa/mapa.component';

/** Accesos rápidos de "Destinos frecuentes" */
const AEROPUERTO = LUGARES.find((l) => l.nombre.startsWith('Aeropuerto'))!;
const TURISMO = LUGARES.find((l) => l.nombre.startsWith('Malecón'))!;

/**
 * Inicio del pasajero (paso 1 y 2 del recorrido):
 * ve su ubicación en el mapa, busca el destino o lo toca en el mapa, y pasa a elegir el vehículo.
 */
@Component({
  selector: 'app-cliente-inicio',
  templateUrl: 'inicio.page.html',
  styleUrls: ['inicio.page.scss'],
  imports: [DecimalPipe, RouterLink, IonContent, IonIcon, IonSpinner, LogoComponent, MapaComponent],
})
export class ClienteInicioPage {
  private auth = inject(AuthService);
  private cliente = inject(ClienteService);
  private gps = inject(UbicacionService);
  private ui = inject(UiService);
  private router = inject(Router);
  private busqueda = inject(BusquedaService);
  private dirs = inject(DireccionesService);
  viaje = inject(ViajePasajeroService);
  private polling?: Subscription;
  private temporizador?: ReturnType<typeof setTimeout>;
  private ubicacionAutomatica = false;

  primerNombre = computed(() => this.auth.usuario()?.name.split(' ')[0] ?? '');
  ubicando = signal(false);
  activo = signal<ViajeActivo | null>(null);
  hayViaje = computed(() => !!this.activo()?.has_active);

  // ---------- Buscador ----------
  /** Qué punto se está buscando: el destino (lo normal) o cambiar el punto de recogida */
  buscandoPara = signal<'destino' | 'origen' | null>(null);
  texto = signal('');
  enLinea = signal<Lugar[]>([]);
  buscandoEnLinea = signal(false);
  sugerencias = computed(() => {
    const t = normalizar(this.texto());
    const propias = [...this.viaje.recientes(), ...LUGARES];
    const unicas = propias.filter((l, i) => propias.findIndex((x) => x.nombre === l.nombre) === i);
    const locales = t ? unicas.filter((l) => normalizar(l.nombre).includes(t)) : unicas.slice(0, 6);
    return [...locales, ...this.enLinea().filter((l) => !locales.some((x) => x.nombre === l.nombre))];
  });

  // ---------- Destinos frecuentes ----------
  frecuentes = computed(() => {
    const d = this.dirs.direcciones();
    return [
      { id: 'casa' as const, nombre: 'Casa', icono: 'home', lugar: d.casa },
      { id: 'trabajo' as const, nombre: 'Trabajo', icono: 'briefcase', lugar: d.trabajo },
      { id: 'aeropuerto' as const, nombre: 'Aeropuerto', icono: 'airplane', lugar: AEROPUERTO },
      { id: 'turismo' as const, nombre: 'Turismo', icono: 'umbrella', lugar: TURISMO },
    ];
  });

  constructor() {
    addIcons({
      airplane, arrowForward, briefcase, car, chevronForward, close, home, locate, navigate, notificationsOutline,
      searchOutline, timeOutline, umbrella,
    });
  }

  // ngOnInit: primera carga (al recargar el navegador Ionic no dispara ionViewWillEnter en la primera página).
  ngOnInit(): void {
    this.ionViewWillEnter();
    this.detectarUbicacion();
  }

  ionViewWillEnter(): void {
    // Revisa cada 10 s si hay un viaje en curso para mostrar el aviso
    this.polling?.unsubscribe();
    this.polling = interval(10000)
      .pipe(startWith(0), switchMap(() => this.cliente.activo()))
      .subscribe({ next: (r) => this.activo.set(r), error: () => undefined });
  }

  ionViewWillLeave(): void {
    this.polling?.unsubscribe();
  }

  // ---------- Buscar ----------

  abrirBuscador(para: 'destino' | 'origen'): void {
    this.buscandoPara.set(para);
    this.texto.set('');
    this.enLinea.set([]);
  }

  cerrarBuscador(): void {
    this.buscandoPara.set(null);
  }

  escribir(valor: string): void {
    this.texto.set(valor);
    clearTimeout(this.temporizador);
    this.enLinea.set([]);
    if (valor.trim().length < 3) return;
    // Espera a que deje de escribir antes de buscar en internet
    this.temporizador = setTimeout(async () => {
      this.buscandoEnLinea.set(true);
      const resultados = await this.busqueda.buscar(valor);
      if (this.texto() === valor) this.enLinea.set(resultados);
      this.buscandoEnLinea.set(false);
    }, 500);
  }

  elegir(lugar: Lugar): void {
    if (this.buscandoPara() === 'origen') this.viaje.origen.set(lugar);
    else this.viaje.destino.set(lugar);
    this.cerrarBuscador();
    this.viaje.estimar();
  }

  quitarDestino(): void {
    this.viaje.destino.set(null);
    this.viaje.estimacion.set(null);
  }

  // ---------- Mapa ----------

  /** Tocar el mapa: si no hay punto de recogida lo pone; si ya hay, pone el destino. */
  tocarMapa(p: Punto): void {
    const lugar: Lugar = { nombre: `Punto en el mapa (${p.lat.toFixed(4)}, ${p.lng.toFixed(4)})`, lat: p.lat, lng: p.lng };
    if (!this.viaje.origen()) this.viaje.origen.set(lugar);
    else this.viaje.destino.set(lugar);
    this.viaje.estimar();
  }

  async usarMiUbicacion(): Promise<void> {
    this.ubicando.set(true);
    try {
      const p = await this.gps.actual();
      const yo = { lat: p.latitude, lng: p.longitude };
      this.viaje.miPosicion.set(yo);
      this.viaje.origen.set({ nombre: 'Mi ubicación', ...yo });
      this.viaje.estimar();
    } catch (e) {
      this.ui.toast((e as Error).message, 'danger');
    } finally {
      this.ubicando.set(false);
    }
  }

  /** Al abrir, pone tu ubicación como punto de recogida sin mostrar errores (si no hay permiso se elige a mano). */
  private async detectarUbicacion(): Promise<void> {
    if (this.ubicacionAutomatica || this.viaje.origen()) return;
    this.ubicacionAutomatica = true;
    try {
      const p = await this.gps.actual();
      const yo = { lat: p.latitude, lng: p.longitude };
      this.viaje.miPosicion.set(yo);
      if (!this.viaje.origen()) {
        this.viaje.origen.set({ nombre: 'Mi ubicación', ...yo });
        this.viaje.estimar();
      }
    } catch { /* sin permiso o sin GPS */ }
  }

  // ---------- Destinos frecuentes ----------

  irAFrecuente(f: { id: string; nombre: string; lugar: Lugar | null }): void {
    if (!f.lugar) {
      this.ui.toast(`Guarda la dirección de tu ${f.nombre.toLowerCase()} para usarla con un toque`);
      this.router.navigate(['/cliente/direcciones'], { queryParams: { tipo: f.id as TipoDireccion } });
      return;
    }
    this.viaje.destino.set(f.lugar);
    this.viaje.estimar();
  }

  // ---------- Avanzar ----------

  notificaciones(): void {
    if (this.hayViaje()) this.router.navigateByUrl('/cliente/viaje');
    else this.ui.toast('No tienes notificaciones nuevas');
  }

  solicitar(): void {
    if (this.hayViaje()) {
      this.router.navigateByUrl('/cliente/viaje');
      return;
    }
    if (!this.viaje.origen()) {
      this.ui.toast('Elige dónde te recogemos: toca "Mi ubicación" o un punto del mapa', 'danger');
      return;
    }
    if (!this.viaje.destino()) {
      this.abrirBuscador('destino');
      return;
    }
    this.router.navigateByUrl('/cliente/vehiculo');
  }
}

function normalizar(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
