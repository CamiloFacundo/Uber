import { Component, inject, signal } from '@angular/core';
import {
  IonContent, IonHeader, IonItem, IonList, IonSelect, IonSelectOption, IonTitle, IonToolbar,
} from '@ionic/angular';
import { Viaje } from '../../core/models/models';
import { AdminService } from '../../core/services/admin.service';
import { UiService } from '../../core/services/ui.service';
import { ESTADO_VIAJE } from '../../shared/estado-viaje';
import { ViajeItemComponent } from '../../shared/viaje-item/viaje-item.component';

/** Todos los viajes de la plataforma: GET /admin/trips?status=... */
@Component({
  selector: 'app-admin-viajes',
  templateUrl: 'viajes.page.html',
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonSelect, IonSelectOption, ViajeItemComponent],
})
export class AdminViajesPage {
  private admin = inject(AdminService);
  private ui = inject(UiService);

  estados = Object.entries(ESTADO_VIAJE).map(([valor, e]) => ({ valor, texto: e.texto }));
  filtro = signal<string>('');
  viajes = signal<Viaje[]>([]);

  // ngOnInit: primera carga (al recargar el navegador Ionic no dispara ionViewWillEnter en la primera página).
  // ionViewWillEnter: cada vez que se vuelve a la pestaña, para ver datos actualizados.
  ngOnInit(): void {
    this.ionViewWillEnter();
  }

  ionViewWillEnter(): void {
    this.cargar();
  }

  cambiarFiltro(valor: string): void {
    this.filtro.set(valor);
    this.cargar();
  }

  private cargar(): void {
    this.admin.viajes(this.filtro() || undefined).subscribe({
      next: (lista) => this.viajes.set(lista),
      error: (err) => this.ui.error(err),
    });
  }
}
