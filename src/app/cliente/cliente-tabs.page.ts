import { Component } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { home, homeOutline, person, personOutline, time, timeOutline, wallet, walletOutline } from 'ionicons/icons';

/** Barra inferior del pasajero: Inicio, Mis viajes, Pagos y Perfil. */
@Component({
  selector: 'app-cliente-tabs',
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  template: `
    <ion-tabs (ionTabsDidChange)="activa = $event.tab">
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="inicio">
          <ion-icon [name]="activa === 'inicio' ? 'home' : 'home-outline'"></ion-icon><ion-label>Inicio</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="historial">
          <ion-icon [name]="activa === 'historial' ? 'time' : 'time-outline'"></ion-icon><ion-label>Mis viajes</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="pagos">
          <ion-icon [name]="activa === 'pagos' ? 'wallet' : 'wallet-outline'"></ion-icon><ion-label>Pagos</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="perfil">
          <ion-icon [name]="activa === 'perfil' ? 'person' : 'person-outline'"></ion-icon><ion-label>Perfil</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
})
export class ClienteTabsPage {
  activa = 'inicio';

  constructor() {
    addIcons({ home, homeOutline, person, personOutline, time, timeOutline, wallet, walletOutline });
  }
}
