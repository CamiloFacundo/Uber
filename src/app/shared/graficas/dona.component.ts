import { Component, computed, input, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';

export interface Segmento {
  etiqueta: string;
  valor: number;
  color: string;
}

/**
 * Gráfica de dona con el total en el centro y leyenda con valores y porcentajes
 * (la identidad nunca depende solo del color). Al pasar el mouse por un segmento o
 * por la leyenda, ese segmento se resalta y el centro muestra su valor.
 */
@Component({
  selector: 'app-dona',
  imports: [DecimalPipe],
  template: `
    <div class="dona">
      <svg viewBox="0 0 120 120" role="img" [attr.aria-label]="resumen()">
        <circle cx="60" cy="60" [attr.r]="radio" fill="none" stroke="var(--rd-linea)" [attr.stroke-width]="grosor" />
        @for (s of arcos(); track s.etiqueta; let i = $index) {
          <circle
            cx="60"
            cy="60"
            [attr.r]="radio"
            fill="none"
            [attr.stroke]="s.color"
            [attr.stroke-width]="activo() === i ? grosor + 4 : grosor"
            [attr.stroke-dasharray]="s.largo + ' ' + circunferencia"
            [attr.stroke-dashoffset]="-s.inicio"
            [attr.opacity]="activo() === null || activo() === i ? 1 : 0.35"
            transform="rotate(-90 60 60)"
            (mouseenter)="activo.set(i)"
            (mouseleave)="activo.set(null)"
          >
            <title>{{ s.etiqueta }}: {{ s.valor }} ({{ s.porcentaje | number: '1.0-0' }}%)</title>
          </circle>
        }
      </svg>
      <div class="centro" aria-hidden="true">
        <strong>{{ (activo() !== null ? arcos()[activo()!].valor : total()) | number }}</strong>
        <span>{{ activo() !== null ? arcos()[activo()!].etiqueta : etiquetaTotal() }}</span>
      </div>
    </div>
    <ul class="leyenda">
      @for (s of arcos(); track s.etiqueta; let i = $index) {
        <li (mouseenter)="activo.set(i)" (mouseleave)="activo.set(null)">
          <span class="muestra" [style.background]="s.color" aria-hidden="true"></span>
          <span class="nombre">{{ s.etiqueta }}</span>
          <span class="valor">{{ s.valor | number }}</span>
          <span class="porcentaje">{{ s.porcentaje | number: '1.0-0' }}%</span>
        </li>
      }
    </ul>
  `,
  styles: `
    :host { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 16px 20px; }
    .dona { position: relative; flex: none; width: 140px; height: 140px; }
    svg { width: 100%; height: 100%; }
    circle { transition: stroke-width 0.15s ease, opacity 0.15s ease; cursor: default; }
    .centro { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; }
    .centro strong { font-family: var(--rd-titulos); font-size: 24px; line-height: 1.1; color: var(--rd-tinta); }
    .centro span { font-size: 12px; color: var(--rd-suave); }
    /* si no cabe al lado de la dona, la leyenda pasa debajo */
    .leyenda { flex: 1 1 190px; display: flex; flex-direction: column; gap: 10px; margin: 0; padding: 0; list-style: none; }
    .leyenda li { display: grid; grid-template-columns: 10px minmax(0, 1fr) auto auto; align-items: center; gap: 8px; font-size: 14px; color: var(--rd-tinta); }
    .muestra { width: 10px; height: 10px; border-radius: 50%; }
    .nombre { color: var(--rd-suave); }
    .valor { font-weight: 600; }
    .porcentaje { min-width: 38px; text-align: right; font-weight: 700; }

  `,
})
export class DonaComponent {
  segmentos = input<Segmento[]>([]);
  etiquetaTotal = input('Total');

  readonly radio = 46;
  readonly grosor = 14;
  readonly circunferencia = 2 * Math.PI * 46;
  activo = signal<number | null>(null);

  total = computed(() => this.segmentos().reduce((s, x) => s + x.valor, 0));

  /** Cada segmento con su largo y punto de inicio; 2 px de separación entre segmentos */
  arcos = computed(() => {
    const total = this.total() || 1;
    const visibles = this.segmentos().filter((s) => s.valor > 0).length;
    const separacion = visibles > 1 ? 2 : 0;
    let inicio = 0;
    return this.segmentos().map((s) => {
      const largoReal = (s.valor / total) * this.circunferencia;
      const arco = { ...s, porcentaje: (s.valor / total) * 100, inicio, largo: Math.max(0, largoReal - separacion) };
      inicio += largoReal;
      return arco;
    });
  });

  resumen = computed(() => this.arcos().map((a) => `${a.etiqueta} ${a.valor}`).join(', '));
}
