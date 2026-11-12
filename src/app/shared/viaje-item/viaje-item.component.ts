import { Component, computed, input } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { IonBadge, IonIcon, IonItem, IonLabel, IonNote } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { carOutline, ellipseOutline, locationOutline } from 'ionicons/icons';
import { Viaje } from '../../core/models/models';
import { estadoViaje } from '../estado-viaje';

/** Tarjeta reutilizable para mostrar un viaje en cualquier lista (admin, conductor o cliente). */
@Component({
  selector: 'app-viaje-item',
  imports: [IonItem, IonLabel, IonBadge, IonNote, IonIcon, CurrencyPipe, DatePipe],
  template: `
    <ion-item lines="full">
      <ion-label>
        <h3>Viaje #{{ viaje().id }}</h3>
        @if (viaje().origin_name) {
          <p><ion-icon name="ellipse-outline" color="secondary"></ion-icon> {{ viaje().origin_name }}</p>
        }
        @if (viaje().destination_name) {
          <p><ion-icon name="location-outline" color="danger"></ion-icon> {{ viaje().destination_name }}</p>
        }
        @if (viaje().driver?.user?.name) {
          <p><ion-icon name="car-outline"></ion-icon> {{ viaje().driver!.user.name }} {{ viaje().vehicle?.plate ? '· ' + viaje().vehicle!.plate : '' }}</p>
        }
        @if (mostrarCliente() && viaje().client?.name) {
          <p>Cliente: {{ viaje().client!.name }}</p>
        }
        @if (fecha()) {
          <p>{{ fecha() | date: 'dd/MM/yyyy h:mm a' }}</p>
        }
      </ion-label>
      <div slot="end" class="derecha">
        @if (tarifa() !== undefined) {
          <ion-note>{{ tarifa() | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</ion-note>
        }
        <ion-badge [color]="estado().color">{{ estado().texto }}</ion-badge>
        <ng-content></ng-content>
      </div>
    </ion-item>
  `,
  styles: `
    .derecha { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
    ion-note { font-weight: 600; }
  `,
})
export class ViajeItemComponent {
  viaje = input.required<Viaje>();
  mostrarCliente = input(false);

  estado = computed(() => estadoViaje(this.viaje().status));
  tarifa = computed(() => this.viaje().final_fare ?? this.viaje().estimated_fare);
  fecha = computed(() => this.viaje().completed_at ?? this.viaje().created_at);

  constructor() {
    addIcons({ ellipseOutline, locationOutline, carOutline });
  }
}
