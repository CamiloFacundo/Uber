import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { star, warning } from 'ionicons/icons';
import { AdminDatosService } from '../../core/services/admin-datos.service';
import { AdminBarraComponent } from '../barra/admin-barra.component';

/**
 * Soporte: incidencias que los pasajeros reportan al calificar un viaje
 * ("Hubo un problema en el viaje"), que llegan en GET /admin/dashboard → recent_incidents.
 */
@Component({
  selector: 'app-admin-soporte',
  imports: [DatePipe, RouterLink, IonHeader, IonContent, IonIcon, AdminBarraComponent],
  template: `
    <ion-header class="ion-no-border"><app-admin-barra></app-admin-barra></ion-header>
    <ion-content class="admin-pagina">
      <div class="admin-contenido">
        <div class="admin-titulo">
          <div>
            <h1>Soporte</h1>
            <p>Reclamos e incidencias reportadas por los pasajeros</p>
          </div>
        </div>

        <div class="lista">
          @for (i of datos.incidencias(); track i.id) {
            <article class="admin-tarjeta incidencia">
              <span class="icono" aria-hidden="true"><ion-icon name="warning"></ion-icon></span>
              <div class="texto">
                <div class="cabeza">
                  <strong>Viaje #{{ i.trip_id ?? i.id }}</strong>
                  @if (i.score) {
                    <span class="puntaje"><ion-icon name="star" aria-hidden="true"></ion-icon> {{ i.score }}</span>
                  }
                  <small>{{ i.created_at | date: 'd MMM y, h:mm a' }}</small>
                </div>
                <p>{{ i.description ?? 'Problema reportado por el pasajero' }}</p>
                <small>Pasajero: {{ i.client ?? '—' }}. Conductor: {{ i.driver ?? '—' }}</small>
              </div>
              @if (i.driver) {
                <a class="boton" routerLink="/admin/conductores" [queryParams]="{ q: i.driver }">Revisar conductor</a>
              }
            </article>
          } @empty {
            <div class="admin-tarjeta vacio">
              <p><strong>No hay incidencias reportadas.</strong></p>
              <p class="admin-nota">Cuando un pasajero marque "Hubo un problema en el viaje" al calificar, aparecerá aquí.</p>
            </div>
          }
        </div>
        <p class="admin-nota">
          Para resolver una incidencia, revisa al conductor y, si corresponde, suspende su cuenta desde Conductores.
          La API todavía no permite marcar incidencias como resueltas.
        </p>
      </div>
    </ion-content>
  `,
  styles: `
    p { margin: 0; }
    .lista { display: flex; flex-direction: column; gap: 10px; }
    .incidencia { display: flex; align-items: flex-start; gap: 14px; }
    .icono { display: grid; place-items: center; flex: none; width: 44px; height: 44px; border-radius: 50%; font-size: 22px; color: var(--rd-alerta); background: var(--rd-alerta-suave); }
    .texto { flex: 1; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
    .cabeza { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .cabeza strong { font-family: var(--rd-titulos); }
    .cabeza small, .texto > small { font-size: 12px; color: var(--rd-suave); }
    .puntaje { font-size: 13px; font-weight: 700; }
    .puntaje ion-icon { vertical-align: -2px; color: var(--rd-cta); }
    .boton { flex: none; align-self: center; padding: 10px 14px; border: 1px solid var(--rd-linea); border-radius: 12px; font-size: 14px; font-weight: 600; text-decoration: none; color: var(--rd-tinta); }
    .vacio { display: flex; flex-direction: column; gap: 6px; text-align: center; padding: 32px; }
    @media (max-width: 640px) { .incidencia { flex-wrap: wrap; } .boton { margin-left: 58px; } }
  `,
})
export class AdminSoportePage {
  datos = inject(AdminDatosService);

  constructor() {
    addIcons({ star, warning });
  }
}
