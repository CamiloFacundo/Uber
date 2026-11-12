import { Component } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { navigateOutline, personOutline, timeOutline } from 'ionicons/icons';

/** Menú inferior (tabs) del cliente. */
@Component({
  selector: 'app-cliente-tabs',
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="inicio">
          <ion-icon name="navigate-outline"></ion-icon><ion-label>Pedir viaje</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="historial">
          <ion-icon name="time-outline"></ion-icon><ion-label>Historial</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="perfil">
          <ion-icon name="person-outline"></ion-icon><ion-label>Perfil</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
})
export class ClienteTabsPage {
  constructor() {
    addIcons({ navigateOutline, timeOutline, personOutline });
  }
}
