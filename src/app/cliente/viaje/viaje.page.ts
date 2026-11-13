import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription, interval, startWith, switchMap } from 'rxjs';
import { IonContent, IonIcon, ModalController, NavController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBack, call, closeCircleOutline, shareSocialOutline, star, timeOutline } from 'ionicons/icons';
import { Viaje, ViajeActivo } from '../../core/models/models';
import { ClienteService } from '../../core/services/cliente.service';
import { UiService } from '../../core/services/ui.service';
import { ViajePasajeroService } from '../../core/services/viaje-pasajero.service';
import { estadoViaje } from '../../shared/estado-viaje';
import { distanciaKm, minutosEnCiudad } from '../../shared/geo';
import { MapaComponent, Punto } from '../../shared/mapa/mapa.component';
import { CalificarComponent } from '../calificar/calificar.component';

/**
 * Paso 5 del recorrido: seguimiento del viaje (GET /client/active cada 5 s).
 * Muestra el conductor, el vehículo, la ruta y la llegada estimada; permite compartir, llamar y cancelar.
 * Cuando el viaje termina, abre la calificación y vuelve a Inicio.
 */
@Component({
  selector: 'app-cliente-viaje',
  templateUrl: 'viaje.page.html',
  styleUrls: ['viaje.page.scss'],
  imports: [CurrencyPipe, DecimalPipe, IonContent, IonIcon, MapaComponent],
})
export class ClienteViajePage {
  private cliente = inject(ClienteService);
  private ui = inject(UiService);
  private router = inject(Router);
  private nav = inject(NavController);
  private modales = inject(ModalController);
  private estado$ = inject(ViajePasajeroService);
  private polling?: Subscription;

  activo = signal<ViajeActivo | null>(null);
  cargado = signal(false);
  viaje = computed(() => (this.activo()?.has_active ? (this.activo()!.data ?? null) : null));
  estado = computed(() => estadoViaje(this.viaje()?.status ?? ''));
  buscando = computed(() => this.viaje()?.status === 'requested');
  puedeCancelar = computed(() => ['requested', 'assigned', 'driver_arrived'].includes(this.viaje()?.status ?? ''));

  private ruta = this.estado$.rutaGuardada;
  nombreOrigen = computed(() => this.viaje()?.origin_name ?? this.ruta()?.origen.nombre ?? '');
  nombreDestino = computed(() => this.viaje()?.destination_name ?? this.ruta()?.destino.nombre ?? '');
  mapaOrigen = computed<Punto | null>(() => this.ruta()?.origen ?? null);
  mapaDestino = computed<Punto | null>(() => this.ruta()?.destino ?? null);
  mapaConductor = computed<Punto | null>(() => {
    const loc = this.viaje()?.driver?.latest_location;
    return loc ? { lat: Number(loc.latitude), lng: Number(loc.longitude) } : null;
  });

  /** Recuadro "Llegada estimada" sobre el mapa */
  eta = computed(() => {
    const v = this.viaje();
    if (!v || v.status === 'requested') return null;
    const conductor = this.mapaConductor();
    const enViaje = v.status === 'in_progress';
    const meta = enViaje ? this.mapaDestino() : this.mapaOrigen();
    if (v.status === 'driver_arrived') return { min: null, texto: 'Tu conductor ya llegó al punto de recogida' };
    if (!conductor || !meta) return null;
    return {
      min: minutosEnCiudad(distanciaKm(conductor, meta)),
      texto: enViaje ? 'Llegada a tu destino' : 'Tu conductor se dirige hacia ti',
    };
  });

  telefono = computed(() => {
    const tel = this.viaje()?.driver?.user.phone;
    return tel ? `tel:${tel}` : null;
  });

  constructor() {
    addIcons({ arrowBack, call, closeCircleOutline, shareSocialOutline, star, timeOutline });
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
        next: (r) => this.actualizar(r),
        error: (err) => this.ui.error(err),
      });
  }

  ionViewWillLeave(): void {
    this.polling?.unsubscribe();
  }

  volver(): void {
    this.nav.navigateBack('/cliente/inicio');
  }

  async cancelar(): Promise<void> {
    const v = this.viaje();
    if (!v) return;
    const motivo = await this.ui.pedirTexto('Cancelar viaje', 'Motivo (opcional)');
    if (motivo === null) return;
    this.cliente.cancelar(v.id, motivo || 'Cancelado por el pasajero').subscribe({
      next: (mensaje) => {
        this.ui.toast(mensaje, 'success');
        this.estado$.guardarRuta(null);
        this.router.navigateByUrl('/cliente/inicio', { replaceUrl: true });
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
      `Desde ${this.nombreOrigen()} hasta ${this.nombreDestino()}.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Mi viaje en AUREN', text: texto });
      } else {
        await navigator.clipboard.writeText(texto);
        this.ui.toast('Datos del viaje copiados', 'success');
      }
    } catch { /* el usuario cerró el diálogo de compartir */ }
  }

  /**
   * Si el viaje desaparece de /client/active, terminó o se canceló:
   * si estaba en curso se abre la calificación; en todo caso se vuelve a Inicio.
   */
  private async actualizar(nuevo: ViajeActivo): Promise<void> {
    const anterior = this.viaje();
    this.cargado.set(true);
    // Si el servidor trae coordenadas de la solicitud, se usan para el mapa
    const d = nuevo.data as (Viaje & { origin_latitude?: number; origin_longitude?: number; destination_latitude?: number; destination_longitude?: number }) | undefined;
    if (d?.origin_latitude && d.destination_latitude && !this.ruta()) {
      this.estado$.guardarRuta({
        origen: { nombre: d.origin_name ?? 'Origen', lat: Number(d.origin_latitude), lng: Number(d.origin_longitude) },
        destino: { nombre: d.destination_name ?? 'Destino', lat: Number(d.destination_latitude), lng: Number(d.destination_longitude) },
      });
    }
    this.activo.set(nuevo);
    if (nuevo.has_active) return;

    this.polling?.unsubscribe();
    this.estado$.guardarRuta(null);
    if (anterior?.status === 'in_progress') {
      const modal = await this.modales.create({ component: CalificarComponent, componentProps: { viaje: anterior } });
      await modal.present();
    } else if (anterior) {
      this.ui.toast('El viaje fue cancelado');
    }
    this.router.navigateByUrl('/cliente/inicio', { replaceUrl: true });
  }
}
