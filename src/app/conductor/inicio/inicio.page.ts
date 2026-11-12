import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Observable, Subscription, interval, startWith, switchMap } from 'rxjs';
import { IonContent, IonFooter, IonIcon, IonSpinner } from '@ionic/angular';
import { Haptics } from '@capacitor/haptics';
import { addIcons } from 'ionicons';
import { call, logoGoogle, navigate, navigateCircle, person, power, timeOutline } from 'ionicons/icons';
import { SolicitudViaje, Viaje } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { ConductorService } from '../../core/services/conductor.service';
import { UbicacionService } from '../../core/services/ubicacion.service';
import { UiService } from '../../core/services/ui.service';
import { MapaComponent, Punto } from '../../shared/mapa/mapa.component';

/** Pasos del viaje en curso, en orden. El índice dice en cuál va el conductor. */
const PASOS = [
  { estado: 'assigned', nombre: 'Recoger' },
  { estado: 'driver_arrived', nombre: 'Llegaste' },
  { estado: 'in_progress', nombre: 'En viaje' },
] as const;

/**
 * Pantalla principal del conductor:
 * - Disponible / no disponible (PUT /driver/availability). Solo si el admin lo aprobó.
 * - Ve solicitudes cada 5 s (GET /driver/ride-requests) y acepta una (409 si otro la tomó primero).
 * - Con el viaje aceptado: Llegué → Iniciar → Finalizar.
 * - Mientras tiene un viaje, envía su GPS cada 10 s (POST /driver/location).
 */
@Component({
  selector: 'app-conductor-inicio',
  templateUrl: 'inicio.page.html',
  styleUrls: ['inicio.page.scss'],
  imports: [CurrencyPipe, DecimalPipe, IonContent, IonFooter, IonIcon, IonSpinner, MapaComponent],
})
export class ConductorInicioPage {
  private auth = inject(AuthService);
  private conductor = inject(ConductorService);
  private gps = inject(UbicacionService);
  private ui = inject(UiService);
  private polling?: Subscription;
  private envioGps?: Subscription;
  private idsVistos = new Set<number>();
  private primeraCarga = true;

  usuario = this.auth.usuario;
  primerNombre = computed(() => this.usuario()?.name.split(' ')[0] ?? '');
  // La API no tiene un GET de disponibilidad, así que se recuerda en el dispositivo
  disponible = signal(localStorage.getItem('disponible') === '1');
  cambiandoDisponible = signal(false);
  solicitudes = signal<SolicitudViaje[]>([]);
  procesando = signal<number | 'viaje' | null>(null);

  enCurso = this.conductor.enCurso;
  miPosicion = signal<Punto | null>(null);

  // ---------- Resumen del día (viajes terminados en este dispositivo) ----------
  private terminados = this.conductor.terminados;
  hoy = computed(() => {
    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);
    const lista = this.terminados().filter((t) => new Date(t.fecha) >= inicio);
    return { viajes: lista.length, ganancias: lista.reduce((s, t) => s + t.tarifa, 0), km: lista.reduce((s, t) => s + t.km, 0) };
  });
  semana = computed(() => {
    const inicio = new Date();
    inicio.setDate(inicio.getDate() - 6);
    inicio.setHours(0, 0, 0, 0);
    return this.terminados().filter((t) => new Date(t.fecha) >= inicio).reduce((s, t) => s + t.tarifa, 0);
  });

  // ---------- Mapa ----------
  mapaOrigen = computed(() => this.puntoDe(this.enCurso()?.solicitud, 'origin'));
  mapaDestino = computed(() => this.puntoDe(this.enCurso()?.solicitud, 'destination'));
  /** Sin viaje: se marcan los puntos de recogida de las solicitudes cercanas */
  mapaSolicitudes = computed(() =>
    this.enCurso() ? [] : this.solicitudes().map((s) => this.puntoDe(s, 'origin')).filter((p): p is Punto => !!p),
  );

  /** A dónde debe ir ahora: al punto de recogida o, ya con el pasajero, al destino. */
  private irA = computed(() => {
    const ec = this.enCurso();
    if (!ec) return null;
    const alDestino = ec.viaje.status === 'in_progress';
    const punto = alDestino ? this.mapaDestino() : this.mapaOrigen();
    const nombre = alDestino ? ec.solicitud.destination_name : ec.solicitud.origin_name;
    return { punto, nombre };
  });
  enlaceGoogle = computed(() => {
    const d = this.irA();
    if (!d) return null;
    const destino = d.punto ? `${d.punto.lat},${d.punto.lng}` : encodeURIComponent(`${d.nombre}, Neiva`);
    return `https://www.google.com/maps/dir/?api=1&destination=${destino}&travelmode=driving`;
  });
  enlaceWaze = computed(() => {
    const d = this.irA();
    if (!d) return null;
    return d.punto
      ? `https://waze.com/ul?ll=${d.punto.lat},${d.punto.lng}&navigate=yes`
      : `https://waze.com/ul?q=${encodeURIComponent(`${d.nombre}, Neiva`)}&navigate=yes`;
  });
  pasos = PASOS;
  pasoActual = computed(() => PASOS.findIndex((p) => p.estado === this.enCurso()?.viaje.status));
  nombreCliente = computed(() => this.enCurso()?.solicitud.client?.name.split(' ')[0] ?? 'al pasajero');

  /** Qué tiene que hacer el conductor ahora, y el botón que lo hace. */
  siguiente = computed(() => {
    const nombre = this.nombreCliente();
    switch (this.enCurso()?.viaje.status) {
      case 'assigned':
        return { titulo: `Ve a recoger a ${nombre}`, boton: 'Llegué al punto de recogida' };
      case 'driver_arrived':
        return { titulo: `${nombre} ya sabe que llegaste`, boton: 'Iniciar viaje' };
      case 'in_progress':
        return { titulo: `Lleva a ${nombre} a su destino`, boton: 'Finalizar viaje' };
      default:
        return null;
    }
  });

  constructor() {
    addIcons({ call, logoGoogle, navigate, navigateCircle, person, power, timeOutline });
  }

  // ngOnInit: primera carga (al recargar el navegador Ionic no dispara ionViewWillEnter en la primera página).
  ngOnInit(): void {
    this.ionViewWillEnter();
  }

  ionViewWillEnter(): void {
    this.polling?.unsubscribe();
    this.polling = interval(5000)
      .pipe(startWith(0), switchMap(() => this.conductor.solicitudes()))
      .subscribe({
        next: (lista) => this.recibirSolicitudes(lista),
        error: (err) => {
          // 403 = conductor no aprobado: no tiene sentido seguir consultando
          if (err?.status === 403) this.polling?.unsubscribe();
          this.ui.error(err);
        },
      });

    this.envioGps?.unsubscribe();
    this.envioGps = interval(10000).pipe(startWith(0)).subscribe(() => this.enviarUbicacion());
  }

  ionViewWillLeave(): void {
    this.polling?.unsubscribe();
    this.envioGps?.unsubscribe();
  }

  alternarDisponible(): void {
    if (this.enCurso() || this.cambiandoDisponible()) return;
    const valor = !this.disponible();
    this.cambiandoDisponible.set(true);
    this.conductor.cambiarDisponibilidad(valor).subscribe({
      next: (estado) => {
        this.cambiandoDisponible.set(false);
        this.guardarDisponible(estado === 'available');
      },
      error: (err) => {
        this.cambiandoDisponible.set(false);
        this.ui.error(err);
      },
    });
  }

  aceptar(s: SolicitudViaje): void {
    this.ejecutar(s.id, this.conductor.aceptar(s), 'Viaje aceptado', () => {
      this.solicitudes.update((lista) => lista.filter((x) => x.id !== s.id));
      this.enviarUbicacion();
    });
  }

  /** El botón grande de abajo: hace el siguiente paso del viaje. */
  async avanzar(): Promise<void> {
    const ec = this.enCurso();
    if (!ec) return;
    const v = ec.viaje;
    if (v.status === 'assigned') {
      this.ejecutar('viaje', this.conductor.llegue(v.id), 'Le avisamos al pasajero que llegaste');
    } else if (v.status === 'driver_arrived') {
      this.ejecutar('viaje', this.conductor.iniciar(v.id), 'Viaje iniciado');
    } else if (v.status === 'in_progress') {
      if (!(await this.ui.confirmar('Finalizar viaje', '¿Ya dejaste al pasajero en su destino?'))) return;
      // Distancia: la estimada por el servidor. Duración: minutos reales desde que inició.
      const km = ec.solicitud.estimated_distance_km ?? 0;
      const inicio = v.started_at ? new Date(v.started_at).getTime() : Date.now();
      const minutos = Math.max(1, Math.round((Date.now() - inicio) / 60000));
      this.ejecutar('viaje', this.conductor.completar(v.id, km, minutos), 'Viaje finalizado');
    }
  }

  /** Para cuando el viaje ya no existe en el servidor (ej. el cliente canceló). */
  async descartar(): Promise<void> {
    if (await this.ui.confirmar('Quitar este viaje', '¿El pasajero canceló el viaje?')) {
      this.conductor.descartarEnCurso();
    }
  }

  telefono(v: Viaje | SolicitudViaje | undefined): string | null {
    const tel = (v as SolicitudViaje | undefined)?.client?.phone;
    return tel ? `tel:${tel}` : null;
  }

  private recibirSolicitudes(lista: SolicitudViaje[]): void {
    // Vibra si llegó una solicitud que no estaba antes (no al abrir la pantalla)
    const hayNueva = lista.some((s) => !this.idsVistos.has(s.id));
    if (hayNueva && !this.primeraCarga && this.disponible() && !this.enCurso()) {
      Haptics.vibrate({ duration: 300 }).catch(() => undefined);
    }
    this.primeraCarga = false;
    this.idsVistos = new Set(lista.map((s) => s.id));
    this.solicitudes.set(lista);
  }

  private ejecutar(clave: number | 'viaje', peticion: Observable<unknown>, mensaje: string, alTerminar?: () => void): void {
    this.procesando.set(clave);
    peticion.subscribe({
      next: () => {
        this.procesando.set(null);
        this.ui.toast(mensaje, 'success');
        alTerminar?.();
      },
      error: (err) => {
        this.procesando.set(null);
        this.ui.error(err);
      },
    });
  }

  private guardarDisponible(valor: boolean): void {
    this.disponible.set(valor);
    try { localStorage.setItem('disponible', valor ? '1' : '0'); } catch { /* sin almacenamiento */ }
  }

  /** Actualiza tu punto en el mapa y, si hay un viaje en curso, se lo envía al servidor. Sin permiso de GPS, se ignora. */
  private async enviarUbicacion(): Promise<void> {
    try {
      const pos = await this.gps.actual();
      this.miPosicion.set({ lat: pos.latitude, lng: pos.longitude });
      const actual = this.enCurso();
      if (actual) this.conductor.enviarUbicacion(pos, actual.viaje.id).subscribe({ error: () => undefined });
    } catch { /* sin GPS */ }
  }

  /** Coordenadas de origen o destino de una solicitud, si la API las trae. */
  private puntoDe(s: SolicitudViaje | undefined, cual: 'origin' | 'destination'): Punto | null {
    const lat = Number(s?.[`${cual}_latitude`]);
    const lng = Number(s?.[`${cual}_longitude`]);
    return lat && lng ? { lat, lng } : null;
  }
}
