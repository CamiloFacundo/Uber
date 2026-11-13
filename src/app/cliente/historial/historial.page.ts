import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { IonButton, IonContent, IonHeader, IonList, IonTitle, IonToolbar, ModalController, IonSegment, IonSegmentButton, IonLabel } from '@ionic/angular';
import { Viaje } from '../../core/models/models';
import { ClienteService } from '../../core/services/cliente.service';
import { UiService } from '../../core/services/ui.service';
import { ViajeItemComponent } from '../../shared/viaje-item/viaje-item.component';
import { CalificarComponent } from '../calificar/calificar.component';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Resumen y historial de viajes del pasajero (GET /client/trips). Permite calificar los finalizados. */
@Component({
  selector: 'app-cliente-historial',
  templateUrl: 'historial.page.html',
  styleUrls: ['historial.page.scss'],
  imports: [
    CurrencyPipe, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonButton, IonSegment, IonSegmentButton, IonLabel,
    ViajeItemComponent,
  ],
})
export class ClienteHistorialPage {
  private cliente = inject(ClienteService);
  private ui = inject(UiService);
  private modales = inject(ModalController);

  viajes = signal<Viaje[]>([]);
  filtro = signal<'todos' | 'completed' | 'cancelled'>('todos');
  filtrados = computed(() => (this.filtro() === 'todos' ? this.viajes() : this.viajes().filter((v) => v.status === this.filtro())));
  cargado = signal(false);

  completados = computed(() => this.viajes().filter((v) => v.status === 'completed'));
  totalGastado = computed(() => this.completados().reduce((s, v) => s + Number(v.final_fare ?? v.estimated_fare ?? 0), 0));
  promedio = computed(() => (this.completados().length ? this.totalGastado() / this.completados().length : 0));

  /** Destino al que más va (si la API trae el nombre del destino). */
  destinoFrecuente = computed(() => {
    const conteo = new Map<string, number>();
    for (const v of this.completados()) {
      if (v.destination_name) conteo.set(v.destination_name, (conteo.get(v.destination_name) ?? 0) + 1);
    }
    const [nombre, veces] = [...conteo.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
    return nombre ? { nombre, veces } : null;
  });

  /** Gasto de los últimos 6 meses, para la gráfica de barras. */
  meses = computed(() => {
    const hoy = new Date();
    const lista = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - 5 + i, 1);
      return { clave: `${d.getFullYear()}-${d.getMonth()}`, nombre: MESES[d.getMonth()], total: 0 };
    });
    for (const v of this.completados()) {
      const f = new Date(v.completed_at ?? v.created_at ?? '');
      const mes = lista.find((m) => m.clave === `${f.getFullYear()}-${f.getMonth()}`);
      if (mes) mes.total += Number(v.final_fare ?? v.estimated_fare ?? 0);
    }
    const max = Math.max(1, ...lista.map((m) => m.total));
    return lista.map((m) => ({ ...m, alto: Math.round((m.total / max) * 100) }));
  });

  ngOnInit(): void {
    this.ionViewWillEnter();
  }

  ionViewWillEnter(): void {
    this.cliente.historial().subscribe({
      next: (lista) => {
        this.viajes.set(lista);
        this.cargado.set(true);
      },
      error: (err) => {
        this.cargado.set(true);
        this.ui.error(err);
      },
    });
  }

  /** Abre la pantalla de calificación. Si ya estaba calificado, el backend responde 400 al enviar. */
  async calificar(v: Viaje): Promise<void> {
    const modal = await this.modales.create({ component: CalificarComponent, componentProps: { viaje: v } });
    await modal.present();
  }
}
