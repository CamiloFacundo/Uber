import { Injectable, computed, signal } from '@angular/core';

export type MetodoPago = 'efectivo' | 'nequi' | 'daviplata' | 'tarjeta';

export const METODOS_PAGO: { id: MetodoPago; nombre: string; detalle: string; icono: string }[] = [
  { id: 'efectivo', nombre: 'Efectivo', detalle: 'Le pagas al conductor al terminar', icono: 'cash-outline' },
  { id: 'nequi', nombre: 'Nequi', detalle: 'Transfieres al conductor al terminar', icono: 'phone-portrait-outline' },
  { id: 'daviplata', nombre: 'Daviplata', detalle: 'Transfieres al conductor al terminar', icono: 'phone-portrait-outline' },
  { id: 'tarjeta', nombre: 'Tarjeta', detalle: 'Débito o crédito con el datáfono del conductor', icono: 'card-outline' },
];

const CLAVE = 'metodo_pago';

/**
 * Método de pago preferido del pasajero. La API no procesa pagos: solo se indica cómo
 * le va a pagar al conductor (se envía como "payment_method" al pedir el viaje).
 */
@Injectable({ providedIn: 'root' })
export class PagoService {
  metodo = signal<MetodoPago>(this.leer());
  actual = computed(() => METODOS_PAGO.find((m) => m.id === this.metodo())!);

  cambiar(metodo: MetodoPago): void {
    this.metodo.set(metodo);
    try {
      localStorage.setItem(CLAVE, metodo);
    } catch { /* sin almacenamiento */ }
  }

  private leer(): MetodoPago {
    try {
      const v = localStorage.getItem(CLAVE) as MetodoPago | null;
      return v && METODOS_PAGO.some((m) => m.id === v) ? v : 'efectivo';
    } catch {
      return 'efectivo';
    }
  }
}
