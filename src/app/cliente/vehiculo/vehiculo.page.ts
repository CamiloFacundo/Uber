import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonIcon, IonSpinner, NavController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBack, busOutline, carOutline, carSportOutline, cardOutline, cashOutline, checkmarkCircle, chevronForward,
  diamondOutline, ellipseOutline, peopleOutline, phonePortraitOutline,
} from 'ionicons/icons';
import { PagoService } from '../../core/services/pago.service';
import { UiService } from '../../core/services/ui.service';
import { ViajePasajeroService } from '../../core/services/viaje-pasajero.service';
import { CATEGORIAS, Categoria, precioCategoria } from '../../shared/categorias';

/**
 * Paso 3 y 4 del recorrido: el pasajero compara los vehículos (precio y puestos),
 * revisa el método de pago y confirma el viaje (POST /client/ride-requests).
 */
@Component({
  selector: 'app-cliente-vehiculo',
  imports: [CurrencyPipe, DecimalPipe, RouterLink, IonContent, IonIcon, IonSpinner],
  template: `
    <ion-content class="vehiculo">
      <div class="pagina">
        <header class="cabecera">
          <button type="button" class="atras" (click)="volver()" aria-label="Volver">
            <ion-icon name="arrow-back"></ion-icon>
          </button>
          <h1>Selecciona un vehículo</h1>
        </header>

        @if (viaje.origen(); as o) {
          <div class="ruta">
            <div class="parada"><span class="punto origen" aria-hidden="true"></span>{{ o.nombre }}</div>
            <div class="parada"><span class="punto destino" aria-hidden="true"></span>{{ viaje.destino()?.nombre }}</div>
            @if (viaje.estimacion(); as e) {
              <p class="ruta-datos">{{ e.distance_km | number: '1.1-1' }} km, unos {{ e.duration_min }} min de viaje</p>
            }
          </div>
        }

        @if (viaje.estimando()) {
          <p class="calculando"><ion-spinner name="dots"></ion-spinner> Calculando precios</p>
        } @else {
          <div class="categorias" role="radiogroup" aria-label="Tipo de vehículo">
            @for (c of categorias; track c.id) {
              <button
                type="button"
                class="categoria"
                role="radio"
                [attr.aria-checked]="viaje.categoria() === c.id"
                [class.elegida]="viaje.categoria() === c.id"
                (click)="viaje.categoria.set(c.id)"
              >
                <span class="foto" aria-hidden="true">
                  @if (c.src) {
                    <ion-icon [src]="c.src"></ion-icon>
                  } @else {
                    <ion-icon [name]="c.icono"></ion-icon>
                  }
                </span>
                <span class="datos">
                  <strong>{{ c.nombre }}</strong>
                  <span>{{ c.detalle }}</span>
                  <span class="asientos"><ion-icon name="people-outline" aria-hidden="true"></ion-icon> {{ c.asientos }}</span>
                </span>
                <span class="derecha">
                  <ion-icon class="check" [name]="viaje.categoria() === c.id ? 'checkmark-circle' : 'ellipse-outline'" aria-hidden="true"></ion-icon>
                  <strong class="precio">{{ precio(c) | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</strong>
                </span>
              </button>
            }
          </div>
        }

        <a class="pago" routerLink="/cliente/pagos">
          <span class="pago-icono" aria-hidden="true"><ion-icon [name]="pago.actual().icono"></ion-icon></span>
          <span class="pago-texto">
            <small>Método de pago</small>
            <strong>{{ pago.actual().nombre }}</strong>
          </span>
          <ion-icon name="chevron-forward" aria-hidden="true"></ion-icon>
        </a>

        <button type="button" class="confirmar" [disabled]="enviando() || !viaje.estimacion()" (click)="confirmar()">
          @if (enviando()) {
            <ion-spinner name="crescent"></ion-spinner>
          } @else {
            Confirmar viaje
          }
        </button>
      </div>
    </ion-content>
  `,
  styles: `
    ion-content.vehiculo { --background: var(--rd-fondo); --color: var(--rd-tinta); }
    h1, p { margin: 0; }
    button, a { font-family: inherit; }
    .pagina {
      display: flex;
      flex-direction: column;
      gap: 14px;
      min-height: 100%;
      max-width: 640px;
      margin: 0 auto;
      padding: calc(env(safe-area-inset-top) + 12px) 18px calc(env(safe-area-inset-bottom) + 20px);
    }
    .cabecera { display: flex; align-items: center; gap: 12px; }
    .cabecera h1 { font-size: 20px; font-weight: 700; }
    .atras {
      display: grid; place-items: center; width: 42px; height: 42px; border: 0; border-radius: 12px;
      font-size: 22px; color: var(--rd-tinta); background: var(--rd-superficie); cursor: pointer;
    }
    .ruta { display: flex; flex-direction: column; gap: 8px; padding: 14px; border-radius: 16px; background: var(--rd-superficie); }
    .parada { display: flex; align-items: center; gap: 12px; font-size: 14px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
    .punto { flex: none; width: 12px; height: 12px; border-radius: 50%; }
    .punto.origen { border: 3px solid var(--rd-primario); background: var(--rd-superficie); }
    .punto.destino { background: var(--rd-sol); box-shadow: 0 0 0 2px var(--rd-superficie), 0 0 0 3.5px var(--rd-sol); }
    .ruta-datos { font-size: 13px; color: var(--rd-suave); }
    .calculando { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--rd-suave); }
    .categorias { display: flex; flex-direction: column; gap: 10px; }
    .categoria {
      display: flex; align-items: center; gap: 14px; width: 100%; padding: 14px;
      border: 1.5px solid var(--rd-linea); border-radius: 18px; text-align: left;
      color: var(--rd-tinta); background: var(--rd-superficie); cursor: pointer;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .categoria.elegida { border-color: var(--rd-cta); box-shadow: 0 0 0 3px rgba(200, 169, 106, 0.22); }
    .categoria:focus-visible { outline: 2px solid var(--rd-primario); outline-offset: 2px; }
    .foto {
      display: grid; place-items: center; flex: none; width: 64px; height: 52px; border-radius: 14px;
      font-size: 30px; color: var(--rd-primario); background: var(--rd-primario-suave);
    }
    .datos { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .datos strong { font-family: var(--rd-titulos); font-size: 16px; }
    .datos span { font-size: 13px; color: var(--rd-suave); }
    .asientos { display: inline-flex; align-items: center; gap: 4px; margin-top: 2px; }
    .derecha { display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }
    .check { font-size: 22px; color: var(--rd-linea); }
    .elegida .check { color: var(--rd-cta); }
    .precio { font-family: var(--rd-titulos); font-size: 17px; }
    .pago {
      display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 1px solid var(--rd-linea);
      border-radius: 16px; text-decoration: none; color: var(--rd-tinta); background: var(--rd-superficie);
    }
    .pago-icono {
      display: grid; place-items: center; width: 40px; height: 40px; border-radius: 10px;
      font-size: 20px; color: var(--rd-primario); background: var(--rd-primario-suave);
    }
    .pago-texto { flex: 1; display: flex; flex-direction: column; }
    .pago-texto small { font-size: 12px; color: var(--rd-suave); }
    .pago-texto strong { font-size: 15px; }
    .confirmar {
      display: grid; place-items: center; min-height: 56px; margin-top: auto; border: 0; border-radius: 16px;
      font-size: 17px; font-weight: 700; color: var(--rd-sobre-cta); background: var(--rd-cta); cursor: pointer;
      box-shadow: 0 6px 18px rgba(200, 169, 106, 0.25);
    }
    .confirmar:hover:not(:disabled) { background: var(--rd-cta-hover); }
    .confirmar:disabled { opacity: 0.5; cursor: default; }
    .confirmar ion-spinner { color: var(--rd-sobre-cta); }
  `,
})
export class ClienteVehiculoPage {
  private router = inject(Router);
  private nav = inject(NavController);
  private ui = inject(UiService);
  viaje = inject(ViajePasajeroService);
  pago = inject(PagoService);

  categorias = CATEGORIAS;
  enviando = signal(false);

  constructor() {
    addIcons({
      arrowBack, busOutline, carOutline, carSportOutline, cardOutline, cashOutline, checkmarkCircle, chevronForward,
      diamondOutline, ellipseOutline, peopleOutline, phonePortraitOutline,
    });
  }

  ngOnInit(): void {
    // Si se abre sin origen o destino (ej. al recargar), vuelve a Inicio
    if (!this.viaje.origen() || !this.viaje.destino()) {
      this.router.navigateByUrl('/cliente/inicio', { replaceUrl: true });
      return;
    }
    if (!this.viaje.estimacion() && !this.viaje.estimando()) this.viaje.estimar();
  }

  precio(c: Categoria): number {
    return precioCategoria(this.viaje.estimacion()?.estimated_fare ?? 0, c);
  }

  volver(): void {
    this.nav.navigateBack('/cliente/inicio');
  }

  confirmar(): void {
    this.enviando.set(true);
    this.viaje.solicitar().subscribe({
      next: () => {
        this.enviando.set(false);
        this.ui.toast('Buscando conductores disponibles…', 'success');
        this.router.navigateByUrl('/cliente/viaje', { replaceUrl: true });
      },
      error: (err) => {
        this.enviando.set(false);
        this.ui.error(err);
      },
    });
  }
}
