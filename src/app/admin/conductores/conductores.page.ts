import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import {
  IonBadge, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonContent, IonHeader,
  IonIcon, IonLabel, IonSegment, IonSegmentButton, IonTitle, IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { carOutline, idCardOutline, mailOutline, star } from 'ionicons/icons';
import { Conductor, EstadoAprobacion } from '../../core/models/models';
import { AdminService } from '../../core/services/admin.service';
import { UiService } from '../../core/services/ui.service';
import { ESTADO_APROBACION } from '../../shared/estado-viaje';

/** Aprobación de conductores: GET /admin/drivers y PATCH /admin/drivers/{id}/approval */
@Component({
  selector: 'app-conductores',
  templateUrl: 'conductores.page.html',
  imports: [
    DecimalPipe, IonHeader, IonToolbar, IonTitle, IonContent, IonSegment, IonSegmentButton, IonLabel, IonCard,
    IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, IonBadge, IonButton, IonIcon,
  ],
})
export class ConductoresPage {
  private admin = inject(AdminService);
  private ui = inject(UiService);

  aprobacion = ESTADO_APROBACION;
  filtro = signal<EstadoAprobacion | 'todos'>('pending');
  conductores = signal<Conductor[]>([]);

  constructor() {
    addIcons({ idCardOutline, mailOutline, carOutline, star });
  }

  ngOnInit(): void {
    this.ionViewWillEnter();
  }

  ionViewWillEnter(): void {
    this.cargar();
  }

  cambiarFiltro(valor: EstadoAprobacion | 'todos'): void {
    this.filtro.set(valor);
    this.cargar();
  }

  cargar(): void {
    const f = this.filtro();
    this.admin.conductores(f === 'todos' ? undefined : f).subscribe({
      next: (lista) => this.conductores.set(lista),
      error: (err) => this.ui.error(err),
    });
  }

  async cambiar(c: Conductor, estado: EstadoAprobacion): Promise<void> {
    const accion = { approved: 'Aprobar', suspended: 'Suspender', rejected: 'Rechazar', pending: 'Marcar pendiente' }[estado];
    const notas = await this.ui.pedirTexto(`${accion} a ${c.user.name}`, 'Notas del administrador');
    if (notas === null) return;
    this.admin.cambiarAprobacion(c.id, estado, notas).subscribe({
      next: (mensaje) => {
        this.ui.toast(mensaje, 'success');
        this.cargar();
      },
      error: (err) => this.ui.error(err),
    });
  }
}
