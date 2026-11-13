import { Component, inject } from '@angular/core';
import { IonContent, IonHeader, IonLabel, IonSegment, IonSegmentButton } from '@ionic/angular';
import { environment } from '../../../environments/environment';
import { AdminDatosService } from '../../core/services/admin-datos.service';
import { AuthService } from '../../core/services/auth.service';
import { ModoTema, TemaService } from '../../core/services/tema.service';
import { UiService } from '../../core/services/ui.service';
import { AdminBarraComponent } from '../barra/admin-barra.component';

/** Configuración del panel: comisión de la plataforma, apariencia, conexión y cuenta. */
@Component({
  selector: 'app-admin-configuracion',
  imports: [IonHeader, IonContent, IonSegment, IonSegmentButton, IonLabel, AdminBarraComponent],
  template: `
    <ion-header class="ion-no-border"><app-admin-barra></app-admin-barra></ion-header>
    <ion-content class="admin-pagina">
      <div class="admin-contenido">
        <div class="admin-titulo">
          <div>
            <h1>Configuración</h1>
            <p>Parámetros del panel de administración</p>
          </div>
        </div>

        <div class="cuadricula">
          <section class="admin-tarjeta">
            <h2>Comisión de la plataforma</h2>
            <p class="admin-nota">Porcentaje de cada viaje que corresponde a AUREN. Se usa en la liquidación de Pagos y en la ganancia neta que ve el conductor.</p>
            <div class="comision">
              <input type="range" min="0" max="40" step="1" [value]="datos.comision()" (input)="datos.cambiarComision(+$any($event.target).value)" aria-label="Comisión en porcentaje" />
              <strong>{{ datos.comision() }}%</strong>
            </div>
            <p class="admin-nota">La API no define comisiones; este valor se guarda en este dispositivo.</p>
          </section>

          <section class="admin-tarjeta">
            <h2>Apariencia</h2>
            <ion-segment [value]="tema.modo()" (ionChange)="cambiarTema($event.detail.value)">
              <ion-segment-button value="oscuro"><ion-label>Oscuro</ion-label></ion-segment-button>
              <ion-segment-button value="claro"><ion-label>Claro</ion-label></ion-segment-button>
              <ion-segment-button value="sistema"><ion-label>Automático</ion-label></ion-segment-button>
            </ion-segment>
          </section>

          <section class="admin-tarjeta">
            <h2>Conexión</h2>
            <dl>
              <div><dt>Modo</dt><dd>{{ simulador ? 'Simulador (sin servidor)' : 'Servidor real' }}</dd></div>
              <div><dt>Servidor</dt><dd>{{ servidor }}</dd></div>
              <div><dt>Estado</dt><dd>{{ datos.enLinea() ? 'En línea' : 'Sin conexión' }}</dd></div>
            </dl>
            @if (simulador) {
              <button type="button" class="boton" (click)="reiniciarSimulador()">Reiniciar datos de prueba</button>
            }
          </section>

          <section class="admin-tarjeta">
            <h2>Mi cuenta</h2>
            <dl>
              <div><dt>Nombre</dt><dd>{{ auth.usuario()?.name }}</dd></div>
              <div><dt>Correo</dt><dd>{{ auth.usuario()?.email }}</dd></div>
            </dl>
            <button type="button" class="boton peligro" (click)="salir()">Cerrar sesión</button>
          </section>
        </div>
      </div>
    </ion-content>
  `,
  styles: `
    h2 { margin: 0 0 10px; font-size: 17px; }
    .cuadricula { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
    .cuadricula .admin-tarjeta { display: flex; flex-direction: column; gap: 12px; }
    .comision { display: flex; align-items: center; gap: 16px; }
    .comision input { flex: 1; accent-color: var(--rd-cta); }
    .comision strong { min-width: 52px; font-family: var(--rd-titulos); font-size: 24px; text-align: right; }
    dl { display: flex; flex-direction: column; gap: 10px; margin: 0; }
    dt { font-size: 12px; color: var(--rd-suave); }
    dd { margin: 2px 0 0; font-weight: 600; word-break: break-all; }
    .boton { align-self: flex-start; height: 42px; padding: 0 16px; border: 1px solid var(--rd-linea); border-radius: 12px; font-size: 14px; font-weight: 600; color: var(--rd-tinta); background: var(--rd-superficie); cursor: pointer; }
    .boton.peligro { color: var(--rd-alerta); border-color: var(--rd-alerta-borde); }
  `,
})
export class AdminConfiguracionPage {
  datos = inject(AdminDatosService);
  tema = inject(TemaService);
  auth = inject(AuthService);
  private ui = inject(UiService);

  simulador = environment.useMock;
  servidor = environment.apiUrl;

  cambiarTema(valor: unknown): void {
    this.tema.cambiar(valor as ModoTema);
  }

  /** Borra los datos del simulador para volver a los de prueba iniciales (solo en modo simulador). */
  async reiniciarSimulador(): Promise<void> {
    if (!(await this.ui.confirmar('Reiniciar datos de prueba', 'Se borran los viajes y cambios hechos en el simulador de este navegador.'))) return;
    try {
      localStorage.removeItem('mock_backend_db');
    } catch { /* sin almacenamiento */ }
    this.datos.actualizar();
    this.ui.toast('Datos de prueba reiniciados', 'success');
  }

  async salir(): Promise<void> {
    if (await this.ui.confirmar('Cerrar sesión', '¿Seguro que quieres salir?')) this.auth.logout();
  }
}
