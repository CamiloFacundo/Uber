import { Component } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { home, homeOutline, map, mapOutline, person, personOutline, time, timeOutline, wallet, walletOutline } from 'ionicons/icons';

/** Barra inferior del conductor: Inicio, Viajes, Ganancias, Mapa y Perfil. */
@Component({
  selector: 'app-conductor-tabs',
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  template: `
    <ion-tabs (ionTabsDidChange)="activa = $event.tab">
      <ion-tab-bar slot="bottom">
        @for (t of tabs; track t.id) {
          <ion-tab-button [tab]="t.id">
            <ion-icon [name]="activa === t.id ? t.icono : t.icono + '-outline'"></ion-icon><ion-label>{{ t.nombre }}</ion-label>
          </ion-tab-button>
        }
      </ion-tab-bar>
    </ion-tabs>
  `,
})
export class ConductorTabsPage {
  activa = 'inicio';
  tabs = [
    { id: 'inicio', nombre: 'Inicio', icono: 'home' },
    { id: 'viajes', nombre: 'Viajes', icono: 'time' },
    { id: 'ganancias', nombre: 'Ganancias', icono: 'wallet' },
    { id: 'mapa', nombre: 'Mapa', icono: 'map' },
    { id: 'perfil', nombre: 'Perfil', icono: 'person' },
  ];

  constructor() {
    addIcons({ home, homeOutline, map, mapOutline, person, personOutline, time, timeOutline, wallet, walletOutline });
  }
}
