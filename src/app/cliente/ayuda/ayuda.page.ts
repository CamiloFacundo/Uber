import { Component } from '@angular/core';
import {
  IonAccordion, IonAccordionGroup, IonBackButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonLabel,
  IonTitle, IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { warningOutline } from 'ionicons/icons';

/** Ayuda y soporte: preguntas frecuentes y línea de emergencias. */
@Component({
  selector: 'app-cliente-ayuda',
  imports: [
    IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonIcon, IonAccordionGroup, IonAccordion,
    IonItem, IonLabel,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="dark">
        <ion-buttons slot="start"><ion-back-button defaultHref="/cliente/perfil" text=""></ion-back-button></ion-buttons>
        <ion-title>Ayuda y soporte</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ayuda">
      <div class="contenido">
        <a class="emergencia" href="tel:123">
          <ion-icon name="warning-outline" aria-hidden="true"></ion-icon>
          <span><strong>¿Una emergencia?</strong> Llama a la Línea 123</span>
        </a>

        <section class="tarjeta">
          <h2>Preguntas frecuentes</h2>
          <ion-accordion-group>
            @for (q of preguntas; track q.p) {
              <ion-accordion [value]="q.p">
                <ion-item slot="header" lines="full"><ion-label class="ion-text-wrap">{{ q.p }}</ion-label></ion-item>
                <div slot="content" class="respuesta">{{ q.r }}</div>
              </ion-accordion>
            }
          </ion-accordion-group>
        </section>
      </div>
    </ion-content>
  `,
  styles: `
    ion-content.ayuda { --background: var(--rd-fondo); }
    h2 { margin: 0; }
    .contenido { display: flex; flex-direction: column; gap: 14px; max-width: 640px; margin: 0 auto; padding: 16px 16px 32px; }
    .tarjeta { display: flex; flex-direction: column; gap: 10px; padding: 16px; border-radius: 18px; background: var(--rd-superficie); }
    .tarjeta h2 { font-size: 17px; font-weight: 700; }
    .respuesta { padding: 12px 16px 16px; font-size: 14px; line-height: 1.55; color: var(--rd-suave); }
    .emergencia {
      display: flex; align-items: center; gap: 10px; padding: 14px; border: 1px solid var(--rd-alerta-borde);
      border-radius: 14px; font-size: 15px; text-decoration: none; color: var(--rd-alerta); background: var(--rd-alerta-suave);
    }
    .emergencia ion-icon { flex: none; font-size: 22px; }
  `,
})
export class ClienteAyudaPage {
  preguntas = [
    {
      p: '¿Cómo se calcula el precio?',
      r: 'Antes de pedir ves la distancia, el tiempo y el precio de cada vehículo. El precio final lo calcula el servidor al terminar el viaje, según la distancia y el tiempo reales.',
    },
    {
      p: '¿Puedo cancelar un viaje?',
      r: 'Sí, mientras el conductor no haya iniciado el recorrido. En "Tu viaje en camino" toca "Cancelar" y escribe el motivo si quieres.',
    },
    {
      p: '¿Cómo sé que el conductor es confiable?',
      r: 'Solo conducen personas aprobadas por un administrador de AUREN. Antes de subir, verifica que la placa coincida con la que ves en la app.',
    },
    {
      p: '¿Cómo pago mi viaje?',
      r: 'Le pagas al conductor al terminar, con el método que elegiste en Pagos: efectivo, Nequi, Daviplata o tarjeta en su datáfono.',
    },
    {
      p: '¿Cómo reporto un problema con un viaje?',
      r: 'Al calificar el viaje marca "Hubo un problema en el viaje" y cuéntanos qué pasó en el comentario.',
    },
  ];

  constructor() {
    addIcons({ warningOutline });
  }
}
