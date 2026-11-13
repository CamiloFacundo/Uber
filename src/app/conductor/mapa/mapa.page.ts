import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription, interval, startWith, switchMap } from 'rxjs';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronForward, locate } from 'ionicons/icons';
import { SolicitudViaje } from '../../core/models/models';
import { ConductorService } from '../../core/services/conductor.service';
import { UbicacionService } from '../../core/services/ubicacion.service';
import { UiService } from '../../core/services/ui.service';
import { MapaComponent, Punto } from '../../shared/mapa/mapa.component';

/**
 * Mapa a pantalla completa: tu posición y los puntos de recogida de las solicitudes cercanas
 * (o la ruta del viaje en curso). Para aceptar, se vuelve a Inicio.
 */
@Component({
  selector: 'app-conductor-mapa',
  imports: [RouterLink, IonContent, IonIcon, MapaComponent],
  template: `
    <ion-content class="mapa-pagina" [fullscreen]="true" [scrollY]="false">
      <div class="mapa">
        <app-mapa [yo]="yo()" [origen]="origen()" [destino]="destino()" [extras]="puntos()"></app-mapa>
      </div>

      <button type="button" class="ubicarme" (click)="ubicar()" aria-label="Centrar en mi ubicación">
        <ion-icon name="locate"></ion-icon>
      </button>

      <a class="hoja" routerLink="/conductor/inicio">
        <span class="estado" [class.en-linea]="conductor.disponible()" aria-hidden="true"></span>
        <span class="texto">
          @if (conductor.enCurso(); as ec) {
            <strong>Viaje en curso</strong>
            <span>Hacia {{ ec.viaje.status === 'in_progress' ? ec.solicitud.destination_name : ec.solicitud.origin_name }}</span>
          } @else if (conductor.disponible()) {
            <strong>{{ puntos().length ? puntos().length + (puntos().length === 1 ? ' solicitud cerca' : ' solicitudes cerca') : 'Buscando pasajeros' }}</strong>
            <span>{{ puntos().length ? 'Toca para responder en Inicio' : 'Los puntos de recogida aparecerán en el mapa' }}</span>
          } @else {
            <strong>Estás desconectado</strong>
            <span>Conéctate en Inicio para recibir viajes</span>
          }
        </span>
        <ion-icon name="chevron-forward" aria-hidden="true"></ion-icon>
      </a>
    </ion-content>
  `,
  styles: `
    ion-content.mapa-pagina { --background: var(--rd-fondo); }
    .mapa { position: absolute; inset: 0; }
    .ubicarme {
      position: absolute; top: calc(env(safe-area-inset-top) + 14px); right: 14px; z-index: 500; display: grid; place-items: center;
      width: 46px; height: 46px; border: 0; border-radius: 14px; font-size: 22px; color: var(--rd-tinta); background: var(--rd-superficie);
      box-shadow: 0 6px 16px rgba(16, 24, 39, 0.25); cursor: pointer;
    }
    .hoja {
      position: absolute; left: 14px; right: 14px; bottom: 14px; z-index: 500; display: flex; align-items: center; gap: 14px;
      max-width: 560px; margin: 0 auto; padding: 16px 18px; border-radius: 18px; text-decoration: none; color: var(--rd-tinta);
      background: var(--rd-superficie); box-shadow: 0 10px 24px rgba(16, 24, 39, 0.3);
    }
    .estado { flex: none; width: 12px; height: 12px; border-radius: 50%; background: var(--rd-suave); }
    .estado.en-linea { background: #2ecc71; box-shadow: 0 0 0 4px rgba(46, 204, 113, 0.25); }
    .texto { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .texto strong { font-family: var(--rd-titulos); font-size: 16px; }
    .texto span { overflow: hidden; font-size: 13px; color: var(--rd-suave); white-space: nowrap; text-overflow: ellipsis; }
    .ubicarme:focus-visible, .hoja:focus-visible { outline: 2px solid var(--rd-primario); outline-offset: 2px; }
  `,
})
export class ConductorMapaPage {
  conductor = inject(ConductorService);
  private gps = inject(UbicacionService);
  private ui = inject(UiService);
  private polling?: Subscription;

  yo = signal<Punto | null>(null);
  private solicitudes = signal<SolicitudViaje[]>([]);

  origen = computed(() => punto(this.conductor.enCurso()?.solicitud, 'origin'));
  destino = computed(() => punto(this.conductor.enCurso()?.solicitud, 'destination'));
  puntos = computed(() =>
    this.conductor.enCurso() || !this.conductor.disponible()
      ? []
      : this.solicitudes()
          .filter((s) => !this.conductor.rechazadas().has(s.id))
          .map((s) => punto(s, 'origin'))
          .filter((p): p is Punto => !!p),
  );

  constructor() {
    addIcons({ chevronForward, locate });
  }

  ngOnInit(): void {
    this.ionViewWillEnter();
  }

  ionViewWillEnter(): void {
    this.ubicar(true);
    this.polling?.unsubscribe();
    this.polling = interval(5000)
      .pipe(startWith(0), switchMap(() => this.conductor.solicitudes()))
      .subscribe({ next: (l) => this.solicitudes.set(l), error: () => this.polling?.unsubscribe() });
  }

  ionViewWillLeave(): void {
    this.polling?.unsubscribe();
  }

  ngOnDestroy(): void {
    this.ionViewWillLeave();
  }

  async ubicar(silencioso = false): Promise<void> {
    try {
      const pos = await this.gps.actual();
      this.yo.set({ lat: pos.latitude, lng: pos.longitude });
    } catch (e) {
      if (!silencioso) this.ui.toast(e instanceof Error ? e.message : 'No pudimos obtener tu ubicación', 'danger');
    }
  }
}

function punto(s: SolicitudViaje | undefined, cual: 'origin' | 'destination'): Punto | null {
  const lat = Number(s?.[`${cual}_latitude`]);
  const lng = Number(s?.[`${cual}_longitude`]);
  return lat && lng ? { lat, lng } : null;
}
