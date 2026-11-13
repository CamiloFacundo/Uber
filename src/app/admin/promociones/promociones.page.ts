import { Component } from '@angular/core';
import { IonContent, IonHeader, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { pricetagOutline } from 'ionicons/icons';
import { AdminBarraComponent } from '../barra/admin-barra.component';

/** Promociones: la API del profesor todavía no tiene cupones ni descuentos. */
@Component({
  selector: 'app-admin-promociones',
  imports: [IonHeader, IonContent, IonIcon, AdminBarraComponent],
  template: `
    <ion-header class="ion-no-border"><app-admin-barra></app-admin-barra></ion-header>
    <ion-content class="admin-pagina">
      <div class="admin-contenido">
        <div class="admin-titulo">
          <div>
            <h1>Promociones</h1>
            <p>Cupones y descuentos para los pasajeros</p>
          </div>
        </div>
        <div class="admin-tarjeta vacio">
          <ion-icon name="pricetag-outline" aria-hidden="true"></ion-icon>
          <h2>Esta sección necesita el backend</h2>
          <p>
            Para crear cupones (código, porcentaje de descuento, fecha de vencimiento y límite de usos) el servidor
            tiene que guardarlos y aplicarlos al calcular la tarifa. La API actual no tiene ese módulo.
          </p>
          <p class="admin-nota">Endpoints sugeridos para el backend: GET/POST /api/admin/promotions y POST /api/client/promotions/apply.</p>
        </div>
      </div>
    </ion-content>
  `,
  styles: `
    .vacio { display: flex; flex-direction: column; align-items: center; gap: 10px; max-width: 640px; margin: 20px auto 0; padding: 40px 28px; text-align: center; }
    .vacio ion-icon { font-size: 42px; color: var(--rd-cta); }
    .vacio h2 { margin: 0; font-size: 20px; }
    .vacio p { margin: 0; line-height: 1.6; color: var(--rd-suave); }
  `,
})
export class AdminPromocionesPage {
  constructor() {
    addIcons({ pricetagOutline });
  }
}
