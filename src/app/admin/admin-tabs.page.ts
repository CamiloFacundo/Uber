import { Component } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { carSportOutline, cashOutline, idCardOutline, personOutline, statsChartOutline } from 'ionicons/icons';

/** Menú inferior (tabs) del administrador. */
@Component({
  selector: 'app-admin-tabs',
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="panel">
          <ion-icon name="stats-chart-outline"></ion-icon><ion-label>Panel</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="conductores">
          <ion-icon name="id-card-outline"></ion-icon><ion-label>Conductores</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="viajes">
          <ion-icon name="car-sport-outline"></ion-icon><ion-label>Viajes</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="tarifas">
          <ion-icon name="cash-outline"></ion-icon><ion-label>Tarifas</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="perfil">
          <ion-icon name="person-outline"></ion-icon><ion-label>Perfil</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
})
export class AdminTabsPage {
  constructor() {
    addIcons({ statsChartOutline, idCardOutline, carSportOutline, cashOutline, personOutline });
  }
}
