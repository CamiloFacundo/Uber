import { Component } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { carOutline, personOutline, walletOutline } from 'ionicons/icons';

/** Menú inferior (tabs) del conductor. */
@Component({
  selector: 'app-conductor-tabs',
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="inicio">
          <ion-icon name="car-outline"></ion-icon><ion-label>Viajes</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="ganancias">
          <ion-icon name="wallet-outline"></ion-icon><ion-label>Ganancias</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="perfil">
          <ion-icon name="person-outline"></ion-icon><ion-label>Perfil</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
})
export class ConductorTabsPage {
  constructor() {
    addIcons({ carOutline, personOutline, walletOutline });
  }
}
