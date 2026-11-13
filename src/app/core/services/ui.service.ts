import { Injectable, inject } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';

/** Mensajes al usuario (toasts y confirmaciones) para no repetir código en cada página. */
@Injectable({ providedIn: 'root' })
export class UiService {
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);
  /** Evita apilar dos diálogos por un doble toque: el segundo se descarta. */
  private dialogoAbierto = false;

  async toast(mensaje: string, color: 'success' | 'danger' | 'medium' = 'medium'): Promise<void> {
    // Los mensajes largos (ej. cómo activar la ubicación) se quedan más tiempo para alcanzar a leerlos
    const duration = Math.min(8000, Math.max(2500, mensaje.length * 60));
    const t = await this.toastCtrl.create({ message: mensaje, duration, color, position: 'top' });
    await t.present();
  }

  /**
   * Muestra el error que manda Laravel:
   * - { message } en errores de negocio (400, 403, 409...)
   * - { message, errors: { campo: ['detalle'] } } en errores de validación (422)
   */
  error(err: unknown): void {
    this.toast(this.mensajeError(err), 'danger');
  }

  mensajeError(err: unknown): string {
    const e = err as { status?: number; error?: { message?: string; errors?: Record<string, string[]> } };
    if (e?.status === 0) return 'No hay conexión con el servidor';
    const primerError = e?.error?.errors ? Object.values(e.error.errors)[0]?.[0] : undefined;
    return primerError ?? e?.error?.message ?? 'Ocurrió un error';
  }

  async confirmar(titulo: string, mensaje: string): Promise<boolean> {
    if (this.dialogoAbierto) return false;
    this.dialogoAbierto = true;
    const alert = await this.alertCtrl.create({
      header: titulo,
      message: mensaje,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Aceptar', role: 'confirm' },
      ],
    });
    try {
      await alert.present();
      const { role } = await alert.onDidDismiss();
      return role === 'confirm';
    } finally {
      this.dialogoAbierto = false;
    }
  }

  /** Pide un texto (ej. motivo de cancelación). Devuelve null si el usuario cancela. */
  async pedirTexto(titulo: string, placeholder: string, valorInicial = ''): Promise<string | null> {
    if (this.dialogoAbierto) return null;
    this.dialogoAbierto = true;
    const alert = await this.alertCtrl.create({
      header: titulo,
      inputs: [{ name: 'texto', type: 'text', placeholder, value: valorInicial }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Aceptar', role: 'confirm' },
      ],
    });
    try {
      await alert.present();
      const { role, data } = await alert.onDidDismiss<{ values: { texto: string } }>();
      return role === 'confirm' ? (data?.values.texto ?? '') : null;
    } finally {
      this.dialogoAbierto = false;
    }
  }
}
