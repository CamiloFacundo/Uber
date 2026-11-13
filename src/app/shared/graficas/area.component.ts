import { Component, computed, input, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';

export interface PuntoSerie {
  etiqueta: string;
  valor: number;
}

let siguienteId = 0;

/**
 * Gráfica de área de una sola serie (ej. ingresos por mes): línea de 2 px, relleno suave,
 * cuadrícula discreta, y al pasar el mouse una línea vertical con el valor del mes.
 * Incluye una tabla oculta con los datos para lectores de pantalla.
 */
@Component({
  selector: 'app-area',
  imports: [CurrencyPipe],
  template: `
    <div class="grafica" (mouseleave)="activo.set(null)">
      <svg [attr.viewBox]="'0 0 ' + ancho + ' ' + alto" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient [attr.id]="id" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="var(--rd-graf-1)" stop-opacity="0.35" />
            <stop offset="1" stop-color="var(--rd-graf-1)" stop-opacity="0" />
          </linearGradient>
        </defs>
        @for (g of guias(); track g.y) {
          <line x1="0" [attr.x2]="ancho" [attr.y1]="g.y" [attr.y2]="g.y" stroke="var(--rd-linea)" stroke-width="1" vector-effect="non-scaling-stroke" />
        }
        @if (dibujo(); as d) {
          <path [attr.d]="d.area" [attr.fill]="'url(#' + id + ')'" />
          <path [attr.d]="d.linea" fill="none" stroke="var(--rd-graf-1)" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
          @if (activo() !== null) {
            <line [attr.x1]="d.xs[activo()!]" [attr.x2]="d.xs[activo()!]" y1="0" [attr.y2]="alto" stroke="var(--rd-suave)" stroke-width="1" stroke-dasharray="3 3" vector-effect="non-scaling-stroke" />
          }
        }
        <!-- zonas para el mouse, más grandes que la línea -->
        @for (p of puntos(); track p.etiqueta; let i = $index) {
          <rect [attr.x]="i * (ancho / puntos().length)" y="0" [attr.width]="ancho / puntos().length" [attr.height]="alto" fill="transparent" (mouseenter)="activo.set(i)" />
        }
      </svg>

      <!-- marcador y etiqueta (en HTML para que no se deformen) -->
      @if (dibujo(); as d) {
        @let i = activo() ?? puntos().length - 1;
        <span class="marcador" [style.left.%]="(d.xs[i] / ancho) * 100" [style.top.%]="(d.ys[i] / alto) * 100"></span>
        <div class="globo" [style.left.%]="(d.xs[i] / ancho) * 100" [class.izquierda]="i > puntos().length / 2">
          <strong>{{ puntos()[i].valor | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</strong>
          <span>{{ puntos()[i].etiqueta }}</span>
        </div>
      }

      <div class="eje-y" aria-hidden="true">
        @for (g of guias(); track g.y) {
          <span [style.top.%]="(g.y / alto) * 100">{{ g.texto }}</span>
        }
      </div>
    </div>
    <div class="eje-x" aria-hidden="true">
      @for (p of puntos(); track p.etiqueta) {
        <span>{{ p.etiqueta }}</span>
      }
    </div>

    <table class="solo-lectores">
      <caption>{{ titulo() }}</caption>
      <tbody>
        @for (p of puntos(); track p.etiqueta) {
          <tr><th scope="row">{{ p.etiqueta }}</th><td>{{ p.valor | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</td></tr>
        }
      </tbody>
    </table>
  `,
  styles: `
    :host { display: block; }
    /* espacio arriba para la etiqueta del valor */
    .grafica { position: relative; height: 170px; margin: 46px 0 0 44px; }
    svg { display: block; width: 100%; height: 100%; overflow: visible; }
    .marcador {
      position: absolute; width: 10px; height: 10px; margin: -5px 0 0 -5px; border-radius: 50%;
      background: var(--rd-graf-1); box-shadow: 0 0 0 2px var(--rd-superficie); pointer-events: none;
    }
    .globo {
      position: absolute; top: -6px; transform: translate(-50%, -100%); display: flex; flex-direction: column;
      padding: 6px 10px; border: 1px solid var(--rd-linea); border-radius: 10px; background: var(--rd-superficie);
      white-space: nowrap; pointer-events: none; box-shadow: 0 4px 14px rgba(16, 24, 39, 0.18);
    }
    .globo.izquierda { transform: translate(-90%, -100%); }
    .globo strong { font-family: var(--rd-titulos); font-size: 14px; color: var(--rd-tinta); }
    .globo span { font-size: 11px; color: var(--rd-suave); }
    .eje-y { position: absolute; top: 0; bottom: 0; left: -44px; width: 38px; }
    .eje-y span { position: absolute; right: 0; transform: translateY(-50%); font-size: 11px; color: var(--rd-suave); }
    .eje-x { display: flex; justify-content: space-between; margin: 8px 0 0 44px; font-size: 12px; color: var(--rd-suave); }
    .solo-lectores { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  `,
})
export class AreaComponent {
  puntos = input<PuntoSerie[]>([]);
  titulo = input('Datos de la gráfica');

  readonly ancho = 300;
  readonly alto = 170;
  id = `area-${++siguienteId}`;
  activo = signal<number | null>(null);

  private maximo = computed(() => {
    const max = Math.max(...this.puntos().map((p) => p.valor), 1);
    // redondea hacia arriba a un número "bonito"
    const potencia = 10 ** Math.floor(Math.log10(max));
    return Math.ceil(max / potencia) * potencia;
  });

  guias = computed(() =>
    [0, 0.25, 0.5, 0.75, 1].map((f) => ({ y: this.alto - f * (this.alto - 10), texto: abreviar(this.maximo() * f) })),
  );

  dibujo = computed(() => {
    const p = this.puntos();
    if (p.length < 2) return null;
    const paso = this.ancho / (p.length - 1);
    const xs = p.map((_, i) => i * paso);
    const ys = p.map((x) => this.alto - (x.valor / this.maximo()) * (this.alto - 10));
    const pts = xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`);
    return { xs, ys, linea: 'M' + pts.join(' L'), area: `M0,${this.alto} L${pts.join(' L')} L${this.ancho},${this.alto} Z` };
  });
}

/** 1250000 → "1,3 M"; 85000 → "85 mil" */
function abreviar(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} mil`;
  return `${Math.round(n)}`;
}
