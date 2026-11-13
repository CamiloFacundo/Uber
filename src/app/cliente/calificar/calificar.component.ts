import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonCheckbox, IonContent, IonIcon, IonSpinner, IonTextarea, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { close, star, starOutline } from 'ionicons/icons';
import { Viaje } from '../../core/models/models';
import { ClienteService } from '../../core/services/cliente.service';
import { UiService } from '../../core/services/ui.service';

const TEXTO_ESTRELLAS = ['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'];
const ETIQUETAS = ['Conducción segura', 'Vehículo limpio', 'Puntual', 'Amable', 'Buena ruta'];

/**
 * Pantalla de calificación (se abre como modal a pantalla completa).
 * POST /client/trips/{id}/rating { score, comment, has_incident }
 * Se cierra con role 'enviada' si el pasajero calificó.
 */
@Component({
  selector: 'app-calificar',
  imports: [CurrencyPipe, FormsModule, IonContent, IonIcon, IonTextarea, IonCheckbox, IonSpinner],
  template: `
    <ion-content class="calificar">
      <div class="contenido">
        <button type="button" class="cerrar" (click)="cerrar()" aria-label="Calificar después">
          <ion-icon name="close"></ion-icon>
        </button>

        <div class="cabeza">
          <span class="avatar" aria-hidden="true">{{ inicial() }}</span>
          <p class="llegaste">Llegaste a tu destino</p>
          <h1>¿Cómo estuvo tu viaje con {{ nombreConductor() }}?</h1>
          @if (viaje.vehicle; as veh) {
            <p class="vehiculo">{{ veh.brand }} {{ veh.model }}, placa {{ veh.plate }}</p>
          }
          @if (viaje.final_fare ?? viaje.estimated_fare; as total) {
            <p class="total">Total del viaje: <strong>{{ total | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</strong></p>
          }
        </div>

        <div class="estrellas" role="radiogroup" aria-label="Calificación">
          @for (i of [1, 2, 3, 4, 5]; track i) {
            <button
              type="button"
              role="radio"
              [attr.aria-checked]="estrellas() === i"
              [attr.aria-label]="i + (i === 1 ? ' estrella' : ' estrellas')"
              (click)="estrellas.set(i)"
            >
              <ion-icon [name]="i <= estrellas() ? 'star' : 'star-outline'"></ion-icon>
            </button>
          }
        </div>
        <p class="texto-estrellas" aria-live="polite">{{ textoEstrellas() || 'Toca las estrellas para calificar' }}</p>

        @if (estrellas()) {
          <div class="etiquetas">
            @for (e of etiquetas; track e) {
              <button type="button" [class.elegida]="elegidas().includes(e)" [attr.aria-pressed]="elegidas().includes(e)" (click)="alternar(e)">
                {{ e }}
              </button>
            }
          </div>

          <ion-textarea
            class="comentario"
            fill="outline"
            placeholder="Cuéntanos algo más (opcional)"
            [(ngModel)]="comentario"
            [autoGrow]="true"
          ></ion-textarea>
          <ion-checkbox [(ngModel)]="incidente" labelPlacement="end">Hubo un problema en el viaje</ion-checkbox>
        }

        <div class="acciones">
          <button type="button" class="enviar" [disabled]="!estrellas() || enviando()" (click)="enviar()">
            @if (enviando()) {
              <ion-spinner name="crescent"></ion-spinner>
            } @else {
              Enviar calificación
            }
          </button>
          <button type="button" class="despues" (click)="cerrar()">Ahora no</button>
        </div>
      </div>
    </ion-content>
  `,
  styles: `
    ion-content.calificar {
      --background:
        radial-gradient(90% 40% at 50% 0%, rgba(8, 127, 140, 0.35), transparent 75%),
        var(--rd-fondo);
    }
    h1, p { margin: 0; }
    button { font-family: inherit; }
    .contenido {
      display: flex;
      flex-direction: column;
      gap: 18px;
      max-width: 480px;
      min-height: 100%;
      margin: 0 auto;
      padding: calc(env(safe-area-inset-top) + 16px) 22px calc(env(safe-area-inset-bottom) + 24px);
    }
    .cerrar {
      align-self: flex-end;
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      border: 0;
      border-radius: 50%;
      font-size: 20px;
      color: var(--rd-tinta);
      background: var(--rd-superficie);
      cursor: pointer;
    }
    .cabeza {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      text-align: center;
    }
    .avatar {
      display: grid;
      place-items: center;
      width: 76px;
      height: 76px;
      margin-bottom: 6px;
      border-radius: 50%;
      font-size: 30px;
      font-weight: 700;
      color: #101827;
      background: #c8a96a;
      box-shadow: 0 0 0 6px var(--rd-superficie);
    }
    .llegaste { font-size: 14px; color: var(--rd-primario-texto); font-weight: 600; }
    h1 { font-size: 24px; font-weight: 700; line-height: 1.25; }
    .vehiculo, .total { font-size: 14px; color: var(--rd-suave); }
    .total strong { color: var(--rd-tinta); }
    .estrellas { display: flex; justify-content: center; gap: 6px; }
    .estrellas button {
      display: grid;
      place-items: center;
      width: 52px;
      height: 52px;
      border: 0;
      font-size: 40px;
      color: #c8a96a;
      background: transparent;
      cursor: pointer;
      transition: transform 0.12s ease;
    }
    .estrellas button:active { transform: scale(0.9); }
    .estrellas button:focus-visible { outline: 2px solid var(--rd-primario); border-radius: 8px; }
    .texto-estrellas { margin-top: -10px; text-align: center; font-size: 15px; font-weight: 600; color: var(--rd-suave); }
    .etiquetas { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
    .etiquetas button {
      height: 36px;
      padding: 0 14px;
      border: 1.5px solid var(--rd-linea);
      border-radius: 999px;
      font-size: 14px;
      color: var(--rd-tinta);
      background: var(--rd-superficie);
      cursor: pointer;
    }
    .etiquetas button.elegida { border-color: var(--rd-primario); color: var(--rd-primario-texto); background: var(--rd-primario-suave); }
    .comentario { --border-radius: 12px; }
    .acciones { display: flex; flex-direction: column; gap: 8px; margin-top: auto; }
    .enviar {
      display: grid;
      place-items: center;
      min-height: 54px;
      border: 0;
      border-radius: 14px;
      font-size: 16px;
      font-weight: 700;
      color: var(--rd-sobre-cta);
      background: var(--rd-cta);
      cursor: pointer;
    }
    .enviar:disabled { opacity: 0.45; cursor: default; }
    .enviar ion-spinner { color: var(--rd-sobre-cta); }
    .despues {
      min-height: 44px;
      border: 0;
      font-size: 15px;
      color: var(--rd-suave);
      background: transparent;
      cursor: pointer;
    }
  `,
})
export class CalificarComponent {
  private modales = inject(ModalController);
  private cliente = inject(ClienteService);
  private ui = inject(UiService);

  /** Lo asigna ModalController.create({ componentProps: { viaje } }) antes de mostrar la pantalla */
  viaje!: Viaje;

  estrellas = signal(0);
  elegidas = signal<string[]>([]);
  enviando = signal(false);
  comentario = '';
  incidente = false;
  etiquetas = ETIQUETAS;

  nombreConductor = computed(() => this.viaje.driver?.user?.name?.split(' ')[0] ?? 'tu conductor');
  inicial = computed(() => this.viaje.driver?.user?.name?.charAt(0) ?? 'A');
  textoEstrellas = computed(() => TEXTO_ESTRELLAS[this.estrellas()]);

  constructor() {
    addIcons({ close, star, starOutline });
  }

  alternar(etiqueta: string): void {
    this.elegidas.update((l) => (l.includes(etiqueta) ? l.filter((e) => e !== etiqueta) : [...l, etiqueta]));
  }

  enviar(): void {
    // Las etiquetas elegidas van al inicio del comentario
    const texto = [this.elegidas().join(', '), this.comentario.trim()].filter(Boolean).join('. ');
    this.enviando.set(true);
    this.cliente.calificar(this.viaje.id, this.estrellas(), texto, this.incidente).subscribe({
      next: (mensaje) => {
        this.enviando.set(false);
        this.ui.toast(mensaje, 'success');
        this.modales.dismiss(null, 'enviada');
      },
      error: (err) => {
        this.enviando.set(false);
        this.ui.error(err);
      },
    });
  }

  cerrar(): void {
    this.modales.dismiss(null, 'cerrada');
  }
}
