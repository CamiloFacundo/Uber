import { Component, inject, input, signal } from '@angular/core';
import {
  IonBackButton, IonButtons, IonContent, IonHeader, IonIcon, IonSelect, IonSelectOption, IonSpinner, IonTitle, IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { briefcase, home, locate, trashOutline } from 'ionicons/icons';
import { Lugar } from '../../core/models/models';
import { DireccionesService, TipoDireccion } from '../../core/services/direcciones.service';
import { UbicacionService } from '../../core/services/ubicacion.service';
import { UiService } from '../../core/services/ui.service';
import { ViajePasajeroService } from '../../core/services/viaje-pasajero.service';
import { LUGARES } from '../../shared/lugares';

/** Mis direcciones: guardar Casa y Trabajo para pedir viajes con un toque desde Inicio. */
@Component({
  selector: 'app-cliente-direcciones',
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonIcon, IonSelect, IonSelectOption, IonSpinner],
  template: `
    <ion-header>
      <ion-toolbar color="dark">
        <ion-buttons slot="start"><ion-back-button defaultHref="/cliente/perfil" text=""></ion-back-button></ion-buttons>
        <ion-title>Mis direcciones</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="direcciones">
      <div class="contenido">
        <p class="nota">Guarda tus lugares de siempre y pídelos con un toque en "Destinos frecuentes".</p>

        @for (t of tipos; track t.id) {
          <section class="tarjeta" [class.resaltada]="tipo() === t.id">
            <div class="cabeza">
              <span class="icono" aria-hidden="true"><ion-icon [name]="t.icono"></ion-icon></span>
              <div class="texto">
                <strong>{{ t.nombre }}</strong>
                <span>{{ dirs.direcciones()[t.id]?.nombre ?? 'Sin guardar' }}</span>
              </div>
              @if (dirs.direcciones()[t.id]) {
                <button type="button" class="quitar" (click)="dirs.guardar(t.id, null)" [attr.aria-label]="'Quitar ' + t.nombre">
                  <ion-icon name="trash-outline"></ion-icon>
                </button>
              }
            </div>

            <ion-select
              [label]="'Elegir ' + t.nombre.toLowerCase()"
              labelPlacement="stacked"
              interface="action-sheet"
              placeholder="Escoge un lugar"
              [value]="null"
              (ionChange)="elegir(t.id, $event.detail.value)"
            >
              @for (l of opciones; track l.nombre) {
                <ion-select-option [value]="l.nombre">{{ l.nombre }}</ion-select-option>
              }
            </ion-select>

            <button type="button" class="ubicacion" (click)="usarUbicacion(t.id)" [disabled]="ubicando() === t.id">
              @if (ubicando() === t.id) {
                <ion-spinner name="crescent"></ion-spinner>
              } @else {
                <ion-icon name="locate" aria-hidden="true"></ion-icon>
              }
              Usar mi ubicación actual
            </button>
          </section>
        }
      </div>
    </ion-content>
  `,
  styles: `
    ion-content.direcciones { --background: var(--rd-fondo); }
    p { margin: 0; }
    button { font-family: inherit; }
    .contenido { display: flex; flex-direction: column; gap: 14px; max-width: 640px; margin: 0 auto; padding: 16px 16px 32px; }
    .nota { font-size: 14px; color: var(--rd-suave); }
    .tarjeta { display: flex; flex-direction: column; gap: 10px; padding: 16px; border: 1.5px solid transparent; border-radius: 18px; background: var(--rd-superficie); }
    .tarjeta.resaltada { border-color: var(--rd-cta); }
    .cabeza { display: flex; align-items: center; gap: 12px; }
    .icono { display: grid; place-items: center; flex: none; width: 44px; height: 44px; border-radius: 12px; font-size: 22px; color: var(--rd-primario); background: var(--rd-primario-suave); }
    .texto { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .texto strong { font-family: var(--rd-titulos); font-size: 16px; }
    .texto span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; color: var(--rd-suave); }
    .quitar { display: grid; place-items: center; width: 38px; height: 38px; border: 0; border-radius: 10px; font-size: 18px; color: var(--rd-alerta); background: transparent; cursor: pointer; }
    .ubicacion {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px;
      border: 1px solid var(--rd-linea); border-radius: 12px; font-size: 14px; font-weight: 600;
      color: var(--rd-tinta); background: var(--rd-superficie); cursor: pointer;
    }
    .ubicacion ion-icon { color: var(--rd-primario); }
    .ubicacion ion-spinner { width: 18px; height: 18px; }
  `,
})
export class ClienteDireccionesPage {
  dirs = inject(DireccionesService);
  private gps = inject(UbicacionService);
  private ui = inject(UiService);
  private viaje = inject(ViajePasajeroService);

  /** ?tipo=casa | trabajo: viene de Inicio cuando la dirección no está guardada */
  tipo = input<TipoDireccion | undefined>(undefined);
  ubicando = signal<TipoDireccion | null>(null);

  tipos: { id: TipoDireccion; nombre: string; icono: string }[] = [
    { id: 'casa', nombre: 'Casa', icono: 'home' },
    { id: 'trabajo', nombre: 'Trabajo', icono: 'briefcase' },
  ];

  /** Lugares conocidos y destinos recientes para elegir */
  opciones: Lugar[] = [...this.viaje.recientes(), ...LUGARES].filter(
    (l, i, lista) => lista.findIndex((x) => x.nombre === l.nombre) === i,
  );

  constructor() {
    addIcons({ briefcase, home, locate, trashOutline });
  }

  elegir(tipo: TipoDireccion, nombre: string | null): void {
    const lugar = this.opciones.find((l) => l.nombre === nombre);
    if (!lugar) return;
    this.dirs.guardar(tipo, lugar);
    this.ui.toast(tipo === 'casa' ? 'Casa guardada' : 'Trabajo guardado', 'success');
  }

  async usarUbicacion(tipo: TipoDireccion): Promise<void> {
    this.ubicando.set(tipo);
    try {
      const p = await this.gps.actual();
      this.dirs.guardar(tipo, { nombre: tipo === 'casa' ? 'Mi casa' : 'Mi trabajo', lat: p.latitude, lng: p.longitude });
      this.ui.toast(`${tipo === 'casa' ? 'Casa guardada' : 'Trabajo guardado'} con tu ubicación actual`, 'success');
    } catch (e) {
      this.ui.toast((e as Error).message, 'danger');
    } finally {
      this.ubicando.set(null);
    }
  }
}
