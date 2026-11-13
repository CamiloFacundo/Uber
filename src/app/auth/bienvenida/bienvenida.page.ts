import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { flashOutline, locationOutline, shieldCheckmarkOutline, starOutline } from 'ionicons/icons';
import { LogoComponent } from '../../shared/logo/logo.component';

/** Pantalla de bienvenida: presenta la marca antes de iniciar sesión o crear cuenta. */
@Component({
  selector: 'app-bienvenida',
  imports: [IonContent, IonIcon, RouterLink, LogoComponent],
  template: `
    <ion-content class="bienvenida" [fullscreen]="true">
      <div class="pantalla">
        <div class="marca">
          <app-logo tono="sobre-oscuro" [alto]="64" [conNombre]="false"></app-logo>
          <h1>AUREN</h1>
          <p class="eslogan">Tu destino, <span>nuestra prioridad</span>.</p>
        </div>

        <ul class="beneficios">
          <li><ion-icon name="shield-checkmark-outline" aria-hidden="true"></ion-icon>Viajes seguros y confiables</li>
          <li><ion-icon name="flash-outline" aria-hidden="true"></ion-icon>Llegada rápida a tu destino</li>
          <li><ion-icon name="location-outline" aria-hidden="true"></ion-icon>Cobertura en Neiva y alrededores</li>
          <li><ion-icon name="star-outline" aria-hidden="true"></ion-icon>Experiencia premium</li>
        </ul>

        <div class="acciones">
          <a class="boton dorado" routerLink="/login">Iniciar sesión</a>
          <a class="boton contorno" routerLink="/registro">Crear cuenta</a>
          <p class="pie">Proyecto académico, FET 2026</p>
        </div>
      </div>
    </ion-content>
  `,
  styles: `
    ion-content.bienvenida {
      --background:
        radial-gradient(80% 50% at 100% 0%, rgba(8, 127, 140, 0.55), transparent 70%),
        radial-gradient(70% 45% at 0% 100%, rgba(200, 169, 106, 0.22), transparent 70%),
        #101827;
      --color: #f5f2ea;
    }
    .pantalla {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 40px;
      min-height: 100%;
      max-width: 460px;
      margin: 0 auto;
      padding: calc(env(safe-area-inset-top) + 72px) 28px calc(env(safe-area-inset-bottom) + 32px);
    }
    .marca {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 14px;
    }
    h1 {
      margin: 8px 0 0;
      font-size: 52px;
      font-weight: 700;
      letter-spacing: 0.12em;
      line-height: 1;
    }
    .eslogan {
      margin: 0;
      max-width: 18ch;
      font-size: 24px;
      line-height: 1.3;
      color: rgba(245, 242, 234, 0.85);
    }
    .eslogan span {
      font-weight: 700;
      color: #c8a96a;
    }
    .beneficios {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px 16px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .beneficios li {
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 14px;
      line-height: 1.35;
      color: rgba(245, 242, 234, 0.8);
    }
    .beneficios ion-icon {
      font-size: 26px;
      color: #c8a96a;
    }
    .acciones {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .boton {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 54px;
      border-radius: 14px;
      font-size: 17px;
      font-weight: 700;
      text-decoration: none;
    }
    .boton:focus-visible {
      outline: 2px solid #c8a96a;
      outline-offset: 3px;
    }
    .dorado {
      color: #101827;
      background: #c8a96a;
    }
    .dorado:hover {
      background: #d6b97c;
    }
    .contorno {
      color: #f5f2ea;
      border: 1.5px solid rgba(245, 242, 234, 0.35);
    }
    .contorno:hover {
      border-color: #f5f2ea;
    }
    .pie {
      margin: 8px 0 0;
      text-align: center;
      font-size: 12px;
      color: rgba(245, 242, 234, 0.5);
    }
  `,
})
export class BienvenidaPage {
  constructor() {
    addIcons({ flashOutline, locationOutline, shieldCheckmarkOutline, starOutline });
  }
}
