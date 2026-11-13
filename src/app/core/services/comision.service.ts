import { Injectable, signal } from '@angular/core';

const CLAVE = 'comision_plataforma';
const POR_DEFECTO = 15;

/** Valor de un viaje separado entre AUREN y el conductor. */
export interface Desglose {
  bruto: number;
  comision: number;
  neto: number;
}

/**
 * Comisión de la plataforma (%), la misma para el administrador (liquidación en Pagos) y el
 * conductor (su ganancia neta). La API del profesor no define comisiones, así que el valor
 * lo ajusta el administrador y se guarda en el dispositivo (15 % por defecto).
 */
@Injectable({ providedIn: 'root' })
export class ComisionService {
  porcentaje = signal<number>(leer());

  cambiar(valor: number): void {
    const v = Math.min(50, Math.max(0, Math.round(valor)));
    this.porcentaje.set(v);
    try {
      localStorage.setItem(CLAVE, String(v));
    } catch { /* sin almacenamiento */ }
  }

  /** Bruto → comisión de AUREN y ganancia neta del conductor (redondeadas a pesos). */
  desglose(bruto: number): Desglose {
    const comision = Math.round((bruto * this.porcentaje()) / 100);
    return { bruto, comision, neto: bruto - comision };
  }
}

function leer(): number {
  try {
    const guardado = localStorage.getItem(CLAVE);
    const v = Number(guardado);
    return guardado !== null && Number.isFinite(v) && v >= 0 ? v : POR_DEFECTO;
  } catch {
    return POR_DEFECTO;
  }
}
