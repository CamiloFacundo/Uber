import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import {
  IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCol, IonContent, IonGrid, IonHeader,
  IonList, IonListHeader, IonRefresher, IonRefresherContent, IonRow, IonTitle, IonToolbar,
} from '@ionic/angular';
import { Estadisticas, Viaje } from '../../core/models/models';
import { AdminService } from '../../core/services/admin.service';
import { UiService } from '../../core/services/ui.service';
import { ViajeItemComponent } from '../../shared/viaje-item/viaje-item.component';

/** Panel del administrador: indicadores (KPIs) de GET /admin/dashboard. */
@Component({
  selector: 'app-panel',
  templateUrl: 'panel.page.html',
  imports: [
    CurrencyPipe, IonHeader, IonToolbar, IonTitle, IonContent, IonGrid, IonRow, IonCol, IonCard, IonCardHeader,
    IonCardTitle, IonCardSubtitle, IonCardContent, IonList, IonListHeader, IonRefresher, IonRefresherContent,
    ViajeItemComponent,
  ],
})
export class PanelPage {
  private admin = inject(AdminService);
  private ui = inject(UiService);

  stats = signal<Estadisticas | null>(null);
  recientes = signal<Viaje[]>([]);

  // ngOnInit: primera carga (al recargar el navegador Ionic no dispara ionViewWillEnter en la primera página).
  // ionViewWillEnter: cada vez que se vuelve a la pestaña, para ver datos actualizados.
  ngOnInit(): void {
    this.ionViewWillEnter();
  }

  ionViewWillEnter(): void {
    this.cargar();
  }

  cargar(evento?: CustomEvent): void {
    const terminar = () => (evento?.target as HTMLIonRefresherElement | undefined)?.complete();
    this.admin.dashboard().subscribe({
      next: (d) => {
        this.stats.set(d.stats);
        this.recientes.set(d.recent_trips);
        terminar();
      },
      error: (err) => {
        this.ui.error(err);
        terminar();
      },
    });
  }
}
