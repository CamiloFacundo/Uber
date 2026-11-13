import { Component, computed, effect, inject, signal } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable, Subscription, interval, startWith, switchMap } from 'rxjs';
import { IonContent, IonFooter, IonIcon, IonSpinner } from '@ionic/angular';
import { Haptics } from '@capacitor/haptics';
import { addIcons } from 'ionicons';
import {
  call, carSportOutline, chatbubbleEllipses, chevronForward, flag, hourglassOutline, logoGoogle, mapOutline, navigate,
  navigateCircle, star, timeOutline, trophyOutline, walletOutline,
} from 'ionicons/icons';
import { SolicitudViaje } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { ComisionService } from '../../core/services/comision.service';
import { ConductorService, ViajeTerminado } from '../../core/services/conductor.service';
import { UbicacionService } from '../../core/services/ubicacion.service';
import { UiService } from '../../core/services/ui.service';
import { distanciaKm, minutosEnCiudad } from '../../shared/geo';
import { LogoComponent } from '../../shared/logo/logo.component';
import { MapaComponent, Punto } from '../../shared/mapa/mapa.component';
import { duracion } from '../../shared/tiempo';
import { ResumenViajeComponent } from '../resumen/resumen.component';
import { SolicitudComponent } from '../solicitud/solicitud.component';

/** Segundos que tiene el conductor para responder una solicitud */
const TIEMPO_RESPUESTA = 15;
/** Meta diaria de ganancia neta (valor fijo de referencia; la API no la define) */
const META_DIARIA = 120000;

/**
 * Pantalla principal del conductor (AUREN Driver). Según el momento muestra:
 * 1. Panel: estado en línea, ganancias de hoy, accesos rápidos y un mapa con las solicitudes cercanas.
 * 2. Nueva solicitud: una a la vez, con 15 s para aceptar o rechazar (rechazar o dejar vencer la oculta en
 *    este dispositivo; la API no tiene endpoint de rechazo).
 * 3. Navegación: hacia el pasajero y luego al destino, con Llegué → Iniciar → Finalizar.
 * 4. Resumen del viaje terminado: valor, comisión de AUREN y ganancia neta.
 * Las solicitudes se consultan cada 5 s y, con un viaje en curso, el GPS se envía cada 10 s.
 */
@Component({
  selector: 'app-conductor-inicio',
  templateUrl: 'inicio.page.html',
  styleUrls: ['inicio.page.scss'],
  imports: [
    CurrencyPipe, DecimalPipe, RouterLink, IonContent, IonFooter, IonIcon, IonSpinner, LogoComponent, MapaComponent,
    SolicitudComponent, ResumenViajeComponent,
  ],
})
export class ConductorInicioPage {
  private auth = inject(AuthService);
  private conductor = inject(ConductorService);
  private gps = inject(UbicacionService);
  private ui = inject(UiService);
  comision = inject(ComisionService);
  private polling?: Subscription;
  private envioGps?: Subscription;
  private reloj?: ReturnType<typeof setInterval>;
  private idsVistos = new Set<number>();
  private primeraCarga = true;
  /** Cuándo se le mostró cada solicitud al conductor (para la cuenta regresiva) */
  private mostradaEn = new Map<number, number>();

  usuario = this.auth.usuario;
  primerNombre = computed(() => this.usuario()?.name.split(' ')[0] ?? '');
  inicial = computed(() => this.usuario()?.name.charAt(0).toUpperCase() ?? '?');
  perfil = this.conductor.perfil;
  vehiculo = this.conductor.vehiculo;
  esMoto = this.conductor.esMoto;

  disponible = this.conductor.disponible;
  cambiandoDisponible = signal(false);
  /** 403 al conectarse o consultar: el administrador aún no aprueba la cuenta */
  sinAprobar = signal(false);
  solicitudes = signal<SolicitudViaje[]>([]);
  procesando = signal<number | 'viaje' | null>(null);
  ahora = signal(Date.now());

  enCurso = this.conductor.enCurso;
  resumen = signal<{ viaje: ViajeTerminado; metodo?: string } | null>(null);
  miPosicion = signal<Punto | null>(null);

  // ---------- Panel: hoy ----------
  hoy = computed(() => {
    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);
    const lista = this.conductor.terminados().filter((t) => new Date(t.fecha) >= inicio);
    const bruto = lista.reduce((s, t) => s + t.tarifa, 0);
    return { viajes: lista.length, ...this.comision.desglose(bruto), minutos: this.conductor.minutosEnLinea(inicio) };
  });
  meta = META_DIARIA;
  duracion = duracion;
  avanceMeta = computed(() => Math.min(100, Math.round((this.hoy().neto / META_DIARIA) * 100)));

  // ---------- Solicitud visible (una a la vez) ----------
  private visibles = computed(() => this.solicitudes().filter((s) => !this.conductor.rechazadas().has(s.id)));
  pendiente = computed(() => (this.disponible() && !this.enCurso() && !this.resumen() ? (this.visibles()[0] ?? null) : null));
  enCola = computed(() => Math.max(0, this.visibles().length - 1));
  tiempoRespuesta = TIEMPO_RESPUESTA;
  restante = computed(() => {
    const p = this.pendiente();
    const desde = p ? this.mostradaEn.get(p.id) : undefined;
    if (!p || !desde) return TIEMPO_RESPUESTA;
    return Math.max(0, TIEMPO_RESPUESTA - Math.floor((this.ahora() - desde) / 1000));
  });

  // ---------- Mapa ----------
  mapaOrigen = computed(() => this.puntoDe(this.enCurso()?.solicitud, 'origin'));
  mapaDestino = computed(() => this.puntoDe(this.enCurso()?.solicitud, 'destination'));
  mapaSolicitudes = computed(() => this.visibles().map((s) => this.puntoDe(s, 'origin')).filter((p): p is Punto => !!p));

  // ---------- Navegación del viaje en curso ----------
  private alDestino = computed(() => this.enCurso()?.viaje.status === 'in_progress');
  /** A dónde debe ir ahora: al punto de recogida o, ya con el pasajero, al destino. */
  private irA = computed(() => {
    const ec = this.enCurso();
    if (!ec) return null;
    return this.alDestino()
      ? { punto: this.mapaDestino(), nombre: ec.solicitud.destination_name }
      : { punto: this.mapaOrigen(), nombre: ec.solicitud.origin_name };
  });
  /** Distancia y minutos hasta el próximo punto (con GPS; si no, lo estimado del viaje) */
  falta = computed(() => {
    const yo = this.miPosicion();
    const d = this.irA();
    if (yo && d?.punto) {
      const km = distanciaKm(yo, d.punto) * 1.3;
      return { km, min: minutosEnCiudad(km) };
    }
    const s = this.enCurso()?.solicitud;
    return this.alDestino() && s ? { km: s.estimated_distance_km, min: s.estimated_duration_min ?? minutosEnCiudad(s.estimated_distance_km) } : null;
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

  /** Progreso: Pasajero → En camino → Destino */
  pasos = ['Pasajero', 'En camino', 'Destino'];
  pasoActual = computed(() => (this.alDestino() ? 1 : 0));
  nombreCliente = computed(() => this.enCurso()?.solicitud.client?.name.split(' ')[0] ?? 'el pasajero');
  telefono = computed(() => this.enCurso()?.solicitud.client?.phone ?? null);
  tarifaViaje = computed(() => {
    const ec = this.enCurso();
    return Number(ec?.viaje.final_fare ?? ec?.viaje.estimated_fare ?? ec?.solicitud.estimated_fare ?? 0);
  });

  /** Qué tiene que hacer el conductor ahora, y el botón que lo hace. */
  siguiente = computed(() => {
    const nombre = this.nombreCliente();
    switch (this.enCurso()?.viaje.status) {
      case 'assigned':
        return { titulo: 'Dirígete al pasajero', detalle: `Recoge a ${nombre}`, boton: 'Llegué al punto de recogida' };
      case 'driver_arrived':
        return { titulo: `Esperando a ${nombre}`, detalle: 'Le avisamos que llegaste', boton: 'Iniciar viaje' };
      case 'in_progress':
        return { titulo: 'Dirígete al destino', detalle: `Lleva a ${nombre}`, boton: 'Finalizar viaje' };
      default:
        return null;
    }
  });

  constructor() {
    addIcons({
      call, carSportOutline, chatbubbleEllipses, chevronForward, flag, hourglassOutline, logoGoogle, mapOutline, navigate,
      navigateCircle, star, timeOutline, trophyOutline, walletOutline,
    });

    // La cuenta regresiva de cada solicitud empieza cuando se le muestra al conductor
    effect(() => {
      const p = this.pendiente();
      if (p && !this.mostradaEn.has(p.id)) {
        this.mostradaEn.set(p.id, Date.now());
        this.ahora.set(Date.now());
      }
    });
  }

  // ngOnInit: primera carga (al recargar el navegador Ionic no dispara ionViewWillEnter en la primera página).
  ngOnInit(): void {
    this.conductor.cargarPerfil().subscribe({ error: () => undefined });
    this.ionViewWillEnter();
  }

  ionViewWillEnter(): void {
    this.polling?.unsubscribe();
    this.polling = interval(5000)
      .pipe(startWith(0), switchMap(() => this.conductor.solicitudes()))
      .subscribe({
        next: (lista) => {
          this.sinAprobar.set(false);
          this.recibirSolicitudes(lista);
        },
        error: (err) => {
          // 403 = conductor no aprobado: no tiene sentido seguir consultando
          if (err?.status === 403) {
            this.polling?.unsubscribe();
            this.sinAprobar.set(true);
          } else {
            this.ui.error(err);
          }
        },
      });

    this.envioGps?.unsubscribe();
    this.envioGps = interval(10000).pipe(startWith(0)).subscribe(() => this.enviarUbicacion());

    clearInterval(this.reloj);
    this.reloj = setInterval(() => this.tic(), 250);
  }

  ionViewWillLeave(): void {
    this.polling?.unsubscribe();
    this.envioGps?.unsubscribe();
    clearInterval(this.reloj);
  }

  ngOnDestroy(): void {
    this.ionViewWillLeave();
  }

  alternarDisponible(): void {
    if (this.enCurso() || this.cambiandoDisponible()) return;
    this.cambiandoDisponible.set(true);
    this.conductor.cambiarDisponibilidad(!this.disponible()).subscribe({
      next: (estado) => {
        this.cambiandoDisponible.set(false);
        if (estado === 'available') this.ionViewWillEnter(); // reanuda la consulta si estaba detenida
      },
      error: (err) => {
        this.cambiandoDisponible.set(false);
        if (err?.status === 403) this.sinAprobar.set(true);
        this.ui.error(err);
      },
    });
  }

  aceptar(): void {
    const s = this.pendiente();
    if (!s) return;
    this.ejecutar(s.id, this.conductor.aceptar(s), 'Viaje aceptado', () => {
      this.solicitudes.update((lista) => lista.filter((x) => x.id !== s.id));
      this.enviarUbicacion();
    }, () => {
      // 409: otro conductor la tomó primero
      this.conductor.rechazar(s.id);
    });
  }

  rechazar(): void {
    const s = this.pendiente();
    if (s) this.conductor.rechazar(s.id);
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
      // Bloquea el botón mientras la confirmación está abierta (evita dos confirmaciones con doble toque)
      this.procesando.set('viaje');
      if (!(await this.ui.confirmar('Finalizar viaje', '¿Ya dejaste al pasajero en su destino?'))) {
        this.procesando.set(null);
        return;
      }
      // Distancia: la estimada por el servidor. Duración: minutos reales desde que inició.
      const km = ec.solicitud.estimated_distance_km ?? 0;
      const inicio = v.started_at ? new Date(v.started_at).getTime() : Date.now();
      const minutos = Math.max(1, Math.round((Date.now() - inicio) / 60000));
      const metodo = ec.solicitud.payment_method;
      this.conductor.completar(v.id, km, minutos).subscribe({
        next: (terminado) => {
          this.procesando.set(null);
          this.resumen.set({ viaje: terminado, metodo });
        },
        error: (err) => {
          this.procesando.set(null);
          this.ui.error(err);
        },
      });
    }
  }

  cerrarResumen(): void {
    this.resumen.set(null);
  }

  /** Para cuando el viaje ya no existe en el servidor (ej. el cliente canceló). */
  async descartar(): Promise<void> {
    if (await this.ui.confirmar('Quitar este viaje', '¿El pasajero canceló el viaje?')) {
      this.conductor.descartarEnCurso();
    }
  }

  /** Avanza el reloj y, si la solicitud visible se venció, la oculta y pasa a la siguiente. */
  private tic(): void {
    this.ahora.set(Date.now());
    const p = this.pendiente();
    if (p && this.restante() === 0 && this.procesando() === null) {
      this.conductor.rechazar(p.id);
      this.ui.toast('La solicitud venció', 'medium');
    }
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

  private ejecutar(
    clave: number | 'viaje', peticion: Observable<unknown>, mensaje: string, alTerminar?: () => void, alFallar?: () => void,
  ): void {
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
        alFallar?.();
      },
    });
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
