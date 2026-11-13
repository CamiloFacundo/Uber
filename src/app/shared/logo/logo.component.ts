import { Component, input } from '@angular/core';

let siguienteId = 0;

/**
 * Logo de AUREN: una "A" teal cuyo travesaño es una carretera dorada con línea central blanca,
 * que termina siendo la pierna derecha de la letra. Al lado, el nombre "AUREN".
 *
 *   <app-logo />                          símbolo + nombre, para fondos claros
 *   <app-logo tono="sobre-oscuro" />      nombre en crema, para fondos oscuros
 *   <app-logo [conNombre]="false" [conFondo]="true" />   ícono de la app (cuadro azul noche)
 */
@Component({
  selector: 'app-logo',
  template: `
    <span class="logo" [class.sobre-oscuro]="tono() === 'sobre-oscuro'" [style.--alto.px]="alto()" role="img" aria-label="AUREN">
      <svg class="simbolo" viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient [attr.id]="id + '-teal'" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#19B5C2" />
            <stop offset="1" stop-color="#087F8C" />
          </linearGradient>
          <linearGradient [attr.id]="id + '-oro'" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#B8945A" />
            <stop offset="1" stop-color="#E2C88F" />
          </linearGradient>
        </defs>
        @if (conFondo()) {
          <rect width="64" height="64" rx="16" fill="#101827" />
        }
        <!-- pierna izquierda y vértice de la A -->
        <path [attr.fill]="'url(#' + id + '-teal)'" d="M7 52L27.5 11H36.5L42.5 23.2C32 25.5 21 33 14.5 44.5L10.8 52Z" />
        <!-- carretera dorada que cruza la A y se vuelve la pierna derecha -->
        <path [attr.fill]="'url(#' + id + '-oro)'" d="M11 52C17 38.5 29 29.5 44 27.6L57 52H47.5L40.3 37.4C31 39.8 24.5 45.3 21.4 52Z" />
        <!-- línea central de la carretera -->
        <path
          d="M16.2 52C21.7 41.6 30.8 34.4 42 32.4"
          fill="none"
          stroke="#FFFFFF"
          stroke-width="1.9"
          stroke-linecap="round"
          stroke-dasharray="4.2 3.6"
        />
      </svg>
      @if (conNombre()) {
        <span class="nombre">AUREN</span>
      }
    </span>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .logo {
      --alto: 40px;
      display: inline-flex;
      align-items: center;
      gap: calc(var(--alto) * 0.22);
      color: var(--rd-tinta, #101827);
    }
    .sobre-oscuro {
      color: #f5f2ea;
    }
    .simbolo {
      width: var(--alto);
      height: var(--alto);
      flex: none;
    }
    .nombre {
      font-family: var(--rd-titulos, system-ui, sans-serif);
      font-size: calc(var(--alto) * 0.72);
      font-weight: 700;
      line-height: 1;
      letter-spacing: 0.1em;
    }
  `,
})
export class LogoComponent {
  alto = input(40);
  conNombre = input(true);
  conFondo = input(false);
  tono = input<'normal' | 'sobre-oscuro'>('normal');

  /** Cada logo en pantalla necesita sus propios ids de degradado */
  id = `auren-${++siguienteId}`;
}
