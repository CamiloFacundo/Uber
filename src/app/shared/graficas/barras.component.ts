import { Component, computed, input, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';

export interface Barra {
  etiqueta: string;
  valor: number;
  /** El periodo actual (hoy, esta semana): se marca con su etiqueta en negrita */
  actual?: boolean;
}

/**
 * Gráfica de barras de una sola serie (ganancias por día, hora o semana).
 * Barras delgadas con punta redondeada, cuadrícula discreta y, al pasar el mouse o tocar,
 * el valor de esa barra. Tabla oculta con los datos para lectores de pantalla.
 */
@Component({
  selector: 'app-barras',
  imports: [CurrencyPipe],
  template: `
    <div class="grafica" (mouseleave)="activo.set(null)">
      <div class="guias" aria-hidden="true">
        @for (g of guias(); track g.f) {
          <span class="guia" [style.bottom.%]="g.f * 100"><small>{{ g.texto }}</small></span>
        }
      </div>
      <div class="columnas" aria-hidden="true">
        @for (b of barras(); track b.etiqueta; let i = $index) {
          <button
            type="button"
            class="columna"
            tabindex="-1"
            (mouseenter)="activo.set(i)"
            (click)="activo.set(activo() === i ? null : i)"
          >
            <span class="barra" [class.vacia]="!b.valor" [class.elegida]="activo() === i" [style.height.%]="b.alto"></span>
            @if (activo() === i) {
              <span class="globo" [class.izq]="i > barras().length * 0.7" [class.der]="i < barras().length * 0.3">
                <strong>{{ b.valor | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</strong>
                <span>{{ b.etiqueta }}</span>
              </span>
            }
          </button>
        }
      </div>
    </div>
    <div class="eje" aria-hidden="true">
      @for (b of barras(); track b.etiqueta) {
        <span [class.actual]="b.actual">{{ b.etiqueta }}</span>
      }
    </div>

    <table class="solo-lectores">
      <caption>{{ titulo() }}</caption>
      <tbody>
        @for (b of barras(); track b.etiqueta) {
          <tr><th scope="row">{{ b.etiqueta }}</th><td>{{ b.valor | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</td></tr>
        }
      </tbody>
    </table>
  `,
  styles: `
    :host { display: block; }
    .grafica { position: relative; height: 150px; margin: 44px 0 0 40px; }
    .guias { position: absolute; inset: 0; pointer-events: none; }
    .guia { position: absolute; left: 0; right: 0; border-top: 1px solid var(--rd-linea); }
    .guia small { position: absolute; left: -40px; width: 34px; transform: translateY(-50%); text-align: right; font-size: 11px; color: var(--rd-suave); }
    .columnas { position: absolute; inset: 0; display: flex; align-items: flex-end; gap: 4px; }
    .columna {
      position: relative; flex: 1; display: flex; align-items: flex-end; justify-content: center; height: 100%;
      padding: 0; border: 0; background: transparent; cursor: pointer;
    }
    .barra {
      width: 100%; max-width: 26px; min-height: 2px; border-radius: 4px 4px 0 0; background: var(--rd-graf-1);
      transition: height 0.3s ease, opacity 0.15s ease;
    }
    .columnas:hover .barra:not(.elegida) { opacity: 0.55; }
    .barra.vacia { background: var(--rd-linea); }
    .globo {
      position: absolute; bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%); z-index: 2;
      display: flex; flex-direction: column; padding: 6px 10px; border: 1px solid var(--rd-linea); border-radius: 10px;
      white-space: nowrap; background: var(--rd-superficie); box-shadow: 0 4px 14px rgba(16, 24, 39, 0.2); pointer-events: none;
    }
    .globo.izq { left: auto; right: 0; transform: none; }
    .globo.der { left: 0; transform: none; }
    .globo strong { font-family: var(--rd-titulos); font-size: 14px; color: var(--rd-tinta); }
    .globo span { font-size: 11px; color: var(--rd-suave); }
    .eje { display: flex; gap: 4px; margin: 8px 0 0 40px; }
    .eje span { flex: 1; min-width: 0; overflow: hidden; text-align: center; font-size: 11px; color: var(--rd-suave); white-space: nowrap; }
    .eje span.actual { font-weight: 700; color: var(--rd-tinta); }
    .solo-lectores { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  `,
})
export class BarrasComponent {
  puntos = input<Barra[]>([]);
  titulo = input('Datos de la gráfica');

  activo = signal<number | null>(null);

  private maximo = computed(() => {
    const max = Math.max(...this.puntos().map((p) => p.valor), 1);
    const potencia = 10 ** Math.floor(Math.log10(max));
    return Math.ceil(max / potencia) * potencia;
  });

  barras = computed(() => this.puntos().map((p) => ({ ...p, alto: (p.valor / this.maximo()) * 100 })));

  guias = computed(() => [0, 0.5, 1].map((f) => ({ f, texto: abreviar(this.maximo() * f) })));
}

/** 1250000 → "1,3 M"; 85000 → "85 mil" */
function abreviar(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} mil`;
  return `${Math.round(n)}`;
}
