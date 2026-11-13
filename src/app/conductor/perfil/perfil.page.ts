import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { IonContent, IonIcon, IonLabel, IonSegment, IonSegmentButton } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  callOutline, carSportOutline, checkmarkCircle, chevronDown, documentTextOutline, helpCircleOutline, hourglassOutline,
  idCardOutline, logOutOutline, mailOutline, star,
} from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import { ComisionService } from '../../core/services/comision.service';
import { ConductorService } from '../../core/services/conductor.service';
import { ModoTema, TemaService } from '../../core/services/tema.service';
import { UiService } from '../../core/services/ui.service';

/**
 * Mi perfil (conductor): datos personales, vehículo (AUREN Car o Moto), estado de documentos,
 * configuración de apariencia, centro de ayuda y cerrar sesión.
 */
@Component({
  selector: 'app-conductor-perfil',
  imports: [DecimalPipe, IonContent, IonIcon, IonSegment, IonSegmentButton, IonLabel],
  template: `
    <ion-content class="perfil" [fullscreen]="true">
      <div class="pagina">
        <h1>Mi perfil</h1>

        <section class="tarjeta cabeza">
          <span class="avatar" aria-hidden="true">{{ inicial() }}</span>
          <div>
            <strong>{{ auth.usuario()?.name }}</strong>
            <span>
              @if (perfil()?.rating_average; as r) {
                <ion-icon name="star" class="estrella" aria-hidden="true"></ion-icon> {{ r | number: '1.1-2' }} ·
              }
              Conductor AUREN
            </span>
          </div>
          @if (textoAprobacion()) {
            <span class="insignia" [class.ok]="aprobado()">{{ textoAprobacion() }}</span>
          }
        </section>

        <section class="tarjeta">
          <h2>Mi vehículo</h2>
          @if (conductor.vehiculo(); as v) {
            <div class="vehiculo">
              <span class="icono-vehiculo" aria-hidden="true">
                @if (v.type === 'moto') {
                  <ion-icon src="assets/icon/moto.svg"></ion-icon>
                } @else {
                  <ion-icon name="car-sport-outline"></ion-icon>
                }
              </span>
              <div>
                <strong>{{ v.brand }} {{ v.model }}</strong>
                <span>{{ v.type === 'moto' ? 'AUREN Moto' : 'AUREN Car' }}{{ v.color ? ' · ' + v.color : '' }}{{ v.year ? ' · ' + v.year : '' }}</span>
              </div>
              <span class="placa">{{ v.plate }}</span>
            </div>
            <p class="nota">
              {{ v.type === 'moto' ? 'Recibes solo solicitudes AUREN Moto.' : 'Recibes solicitudes Eco, Confort, Plus y Van según tu vehículo.' }}
            </p>
          } @else {
            <p class="nota">El servidor no envió los datos de tu vehículo. Son los que registraste al crear la cuenta.</p>
          }
        </section>

        <section class="tarjeta">
          <h2>Documentos</h2>
          <ul class="documentos">
            <li>
              <ion-icon name="id-card-outline" aria-hidden="true"></ion-icon>
              <span><strong>Licencia de conducción</strong><small>{{ perfil()?.license_number ?? 'Registrada' }}</small></span>
              <span class="estado" [class.ok]="aprobado()">
                <ion-icon [name]="aprobado() ? 'checkmark-circle' : sinDatos() ? 'document-text-outline' : 'hourglass-outline'" aria-hidden="true"></ion-icon>
                {{ aprobado() ? 'Verificada' : sinDatos() ? 'Registrada' : 'En revisión' }}
              </span>
            </li>
            <li>
              <ion-icon name="document-text-outline" aria-hidden="true"></ion-icon>
              <span><strong>Datos del vehículo</strong><small>{{ conductor.vehiculo()?.plate ?? 'Registrados' }}</small></span>
              <span class="estado" [class.ok]="aprobado()">
                <ion-icon [name]="aprobado() ? 'checkmark-circle' : sinDatos() ? 'document-text-outline' : 'hourglass-outline'" aria-hidden="true"></ion-icon>
                {{ aprobado() ? 'Verificados' : sinDatos() ? 'Registrados' : 'En revisión' }}
              </span>
            </li>
          </ul>
          <p class="nota">La verificación la hace un administrador al aprobar tu cuenta.</p>
        </section>

        <section class="tarjeta">
          <h2>Cuenta</h2>
          <dl class="datos">
            <div><dt><ion-icon name="mail-outline" aria-hidden="true"></ion-icon> Correo</dt><dd>{{ auth.usuario()?.email }}</dd></div>
            <div><dt><ion-icon name="call-outline" aria-hidden="true"></ion-icon> Teléfono</dt><dd>{{ auth.usuario()?.phone ?? '—' }}</dd></div>
          </dl>
        </section>

        <section class="tarjeta">
          <h2>Apariencia</h2>
          <ion-segment [value]="tema.modo()" (ionChange)="cambiarTema($event.detail.value)">
            <ion-segment-button value="oscuro"><ion-label>Oscuro</ion-label></ion-segment-button>
            <ion-segment-button value="claro"><ion-label>Claro</ion-label></ion-segment-button>
            <ion-segment-button value="sistema"><ion-label>Automático</ion-label></ion-segment-button>
          </ion-segment>
        </section>

        <section class="tarjeta">
          <h2><ion-icon name="help-circle-outline" aria-hidden="true"></ion-icon> Centro de ayuda</h2>
          @for (p of preguntas(); track p.q; let i = $index) {
            <div class="pregunta">
              <button type="button" (click)="abierta.set(abierta() === i ? null : i)" [attr.aria-expanded]="abierta() === i">
                {{ p.q }}
                <ion-icon name="chevron-down" [class.girada]="abierta() === i" aria-hidden="true"></ion-icon>
              </button>
              @if (abierta() === i) {
                <p>{{ p.r }}</p>
              }
            </div>
          }
        </section>

        <button type="button" class="salir" (click)="salir()">
          <ion-icon name="log-out-outline" aria-hidden="true"></ion-icon> Cerrar sesión
        </button>
      </div>
    </ion-content>
  `,
  styles: `
    ion-content.perfil { --background: var(--rd-fondo); }
    h1, h2, p, dl, dd { margin: 0; }
    .pagina {
      display: flex; flex-direction: column; gap: 14px; max-width: 640px; margin: 0 auto;
      padding: calc(env(safe-area-inset-top) + 18px) 18px 28px;
    }
    h1 { font-size: 26px; font-weight: 700; }
    .tarjeta { display: flex; flex-direction: column; gap: 12px; padding: 16px 18px; border-radius: 18px; background: var(--rd-superficie); }
    .tarjeta h2 { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 700; }
    .cabeza { flex-direction: row; align-items: center; gap: 14px; }
    .cabeza > div { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .cabeza strong { font-family: var(--rd-titulos); font-size: 18px; }
    .cabeza span { font-size: 13px; color: var(--rd-suave); }
    .avatar {
      display: grid; place-items: center; flex: none; width: 58px; height: 58px; border-radius: 50%;
      font-family: var(--rd-titulos); font-size: 22px; font-weight: 700; color: #101827; background: #c8a96a;
    }
    .estrella { color: var(--rd-cta); vertical-align: -2px; }
    .insignia { flex: none; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; color: var(--rd-tinta) !important; background: var(--rd-alerta-suave); }
    .insignia.ok { color: var(--rd-primario-texto) !important; background: var(--rd-primario-suave); }
    .vehiculo { display: flex; align-items: center; gap: 14px; }
    .vehiculo > div { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .vehiculo span { font-size: 13px; color: var(--rd-suave); }
    .icono-vehiculo { display: grid; place-items: center; flex: none; width: 48px; height: 48px; border-radius: 14px; font-size: 26px; color: var(--rd-primario) !important; background: var(--rd-primario-suave); }
    .placa {
      flex: none; padding: 4px 10px; border: 2px solid #101827; border-radius: 6px; font-family: var(--rd-titulos);
      font-size: 14px !important; font-weight: 700; letter-spacing: 0.06em; color: #101827 !important; background: #f2c94c;
    }
    .nota { font-size: 13px; color: var(--rd-suave); }
    .documentos { display: flex; flex-direction: column; gap: 12px; margin: 0; padding: 0; list-style: none; }
    .documentos li { display: flex; align-items: center; gap: 12px; }
    .documentos li > ion-icon { flex: none; font-size: 22px; color: var(--rd-primario); }
    .documentos li > span:nth-child(2) { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .documentos small { font-size: 12px; color: var(--rd-suave); }
    .estado { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 600; color: var(--rd-suave); }
    .estado.ok { color: var(--rd-primario-texto); }
    .datos { display: flex; flex-direction: column; gap: 10px; }
    .datos div { display: flex; justify-content: space-between; gap: 12px; font-size: 14px; }
    .datos dt { display: inline-flex; align-items: center; gap: 6px; color: var(--rd-suave); }
    .datos dd { min-width: 0; overflow-wrap: anywhere; text-align: right; font-weight: 600; }
    .pregunta { border-top: 1px solid var(--rd-linea); }
    .pregunta button {
      display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%; padding: 12px 0; border: 0;
      text-align: left; font-family: var(--rd-letra); font-size: 15px; font-weight: 600; color: var(--rd-tinta); background: transparent; cursor: pointer;
    }
    .pregunta ion-icon { flex: none; transition: transform 0.2s ease; }
    .pregunta ion-icon.girada { transform: rotate(180deg); }
    .pregunta p { padding-bottom: 12px; font-size: 14px; line-height: 1.5; color: var(--rd-suave); }
    .salir {
      display: flex; align-items: center; justify-content: center; gap: 8px; height: 52px; border: 1px solid var(--rd-alerta-borde);
      border-radius: 16px; font-family: var(--rd-titulos); font-size: 16px; font-weight: 700; color: var(--rd-alerta); background: transparent; cursor: pointer;
    }
    button:focus-visible { outline: 2px solid var(--rd-primario); outline-offset: 2px; }
  `,
})
export class ConductorPerfilPage {
  auth = inject(AuthService);
  conductor = inject(ConductorService);
  tema = inject(TemaService);
  private comision = inject(ComisionService);
  private ui = inject(UiService);

  perfil = this.conductor.perfil;
  inicial = computed(() => this.auth.usuario()?.name.charAt(0).toUpperCase() ?? '?');
  aprobado = computed(() => this.perfil()?.approval_status === 'approved');
  /** Con el backend real no llega el estado de aprobación: se muestra como registrado, sin afirmar nada */
  sinDatos = computed(() => !this.perfil()?.approval_status);
  textoAprobacion = computed(() => {
    const e = this.perfil()?.approval_status;
    if (!e) return '';
    if (e === 'pending') return 'En revisión';
    if (e === 'suspended') return 'Suspendido';
    if (e === 'rejected') return 'Rechazado';
    return 'Verificado';
  });
  abierta = signal<number | null>(null);

  preguntas = computed(() => [
    {
      q: '¿Cómo recibo viajes?',
      r: 'Activa "En línea" en Inicio. Cada solicitud cercana aparece una a la vez y tienes 15 segundos para aceptarla o rechazarla.',
    },
    {
      q: '¿Cuánto gano por viaje?',
      r: `El valor del viaje menos la comisión de AUREN (${this.comision.porcentaje()}%). Lo ves antes de aceptar y en el resumen al finalizar.`,
    },
    {
      q: '¿Qué pasa si otro conductor acepta primero?',
      r: 'El primero que acepta se queda con el viaje; a los demás les aparece un aviso y la solicitud desaparece.',
    },
    {
      q: '¿Qué hago si el pasajero canceló?',
      r: 'Antes de iniciar el viaje, toca "El pasajero canceló el viaje" para quitarlo de tu pantalla y volver a recibir solicitudes.',
    },
  ]);

  constructor() {
    addIcons({
      callOutline, carSportOutline, checkmarkCircle, chevronDown, documentTextOutline, helpCircleOutline, hourglassOutline,
      idCardOutline, logOutOutline, mailOutline, star,
    });
  }

  ngOnInit(): void {
    this.conductor.cargarPerfil().subscribe({ error: () => undefined });
    this.auth.refrescarPerfil().subscribe({ error: () => undefined });
  }

  cambiarTema(valor: unknown): void {
    this.tema.cambiar(valor as ModoTema);
  }

  async salir(): Promise<void> {
    if (await this.ui.confirmar('Cerrar sesión', '¿Seguro que quieres salir?')) this.auth.logout();
  }
}
