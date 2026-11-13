import { Injectable, computed, signal } from '@angular/core';

export type ModoTema = 'oscuro' | 'claro' | 'sistema';

const CLAVE = 'tema';

/**
 * Tema de la app: oscuro (por defecto), claro o según el sistema.
 * Aplica la clase .ion-palette-dark en <html> (ver global.scss y theme/variables.scss).
 */
@Injectable({ providedIn: 'root' })
export class TemaService {
  private consulta = window.matchMedia?.('(prefers-color-scheme: dark)');
  private sistemaOscuro = signal(this.consulta?.matches ?? false);

  modo = signal<ModoTema>(this.leer());
  /** true si en este momento la app se ve oscura */
  oscuro = computed(() => (this.modo() === 'sistema' ? this.sistemaOscuro() : this.modo() === 'oscuro'));

  constructor() {
    this.consulta?.addEventListener('change', (e) => {
      this.sistemaOscuro.set(e.matches);
      this.aplicar();
    });
    this.aplicar();
  }

  cambiar(modo: ModoTema): void {
    this.modo.set(modo);
    try {
      localStorage.setItem(CLAVE, modo);
    } catch { /* sin almacenamiento */ }
    this.aplicar();
  }

  private aplicar(): void {
    document.documentElement.classList.toggle('ion-palette-dark', this.oscuro());
  }

  private leer(): ModoTema {
    try {
      const v = localStorage.getItem(CLAVE);
      return v === 'claro' || v === 'sistema' || v === 'oscuro' ? v : 'oscuro';
    } catch {
      return 'oscuro';
    }
  }
}
