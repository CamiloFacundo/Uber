import { Component, computed, input } from '@angular/core';

let siguienteId = 0;

/**
 * Minigráfica de tendencia para las tarjetas de indicadores (una sola serie, sin ejes).
 * Línea de 2 px con un relleno muy suave debajo y un punto en el último valor.
 */
@Component({
  selector: 'app-sparkline',
  template: `
    <svg [attr.viewBox]="'0 0 ' + ancho + ' ' + alto" preserveAspectRatio="none" role="img" [attr.aria-label]="descripcion()">
      <defs>
        <linearGradient [attr.id]="id" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" [attr.stop-color]="color()" stop-opacity="0.28" />
          <stop offset="1" [attr.stop-color]="color()" stop-opacity="0" />
        </linearGradient>
      </defs>
      @if (camino(); as c) {
        <path [attr.d]="c.area" [attr.fill]="'url(#' + id + ')'" />
        <path [attr.d]="c.linea" fill="none" [attr.stroke]="color()" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
      }
    </svg>
  `,
  styles: `
    :host { display: block; width: 100%; height: 100%; }
    svg { display: block; width: 100%; height: 100%; overflow: visible; }
  `,
})
export class SparklineComponent {
  valores = input<number[]>([]);
  color = input('var(--rd-graf-1)');
  descripcion = input('Tendencia');

  readonly ancho = 120;
  readonly alto = 40;
  id = `spark-${++siguienteId}`;

  camino = computed(() => {
    const v = this.valores();
    if (v.length < 2) return null;
    const max = Math.max(...v, 1);
    const min = Math.min(...v, 0);
    const paso = this.ancho / (v.length - 1);
    const y = (n: number) => this.alto - 3 - ((n - min) / (max - min || 1)) * (this.alto - 6);
    const pts = v.map((n, i) => `${(i * paso).toFixed(1)},${y(n).toFixed(1)}`);
    return {
      linea: 'M' + pts.join(' L'),
      area: `M0,${this.alto} L${pts.join(' L')} L${this.ancho},${this.alto} Z`,
    };
  });
}
