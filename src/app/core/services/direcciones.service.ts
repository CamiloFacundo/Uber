import { Injectable, signal } from '@angular/core';
import { Lugar } from '../models/models';

export type TipoDireccion = 'casa' | 'trabajo';

const CLAVE = 'mis_direcciones';

/**
 * Direcciones guardadas del pasajero (Casa y Trabajo) para los accesos rápidos de Inicio.
 * La API no tiene este módulo, así que se guardan en el dispositivo.
 */
@Injectable({ providedIn: 'root' })
export class DireccionesService {
  direcciones = signal<Record<TipoDireccion, Lugar | null>>(this.leer());

  guardar(tipo: TipoDireccion, lugar: Lugar | null): void {
    this.direcciones.update((d) => ({ ...d, [tipo]: lugar }));
    try {
      localStorage.setItem(CLAVE, JSON.stringify(this.direcciones()));
    } catch { /* sin almacenamiento */ }
  }

  private leer(): Record<TipoDireccion, Lugar | null> {
    try {
      const v = localStorage.getItem(CLAVE);
      if (v) return { casa: null, trabajo: null, ...JSON.parse(v) };
    } catch { /* usar vacío */ }
    return { casa: null, trabajo: null };
  }
}
