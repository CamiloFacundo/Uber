import { Component, computed, inject } from '@angular/core';
import {
  IonButton, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonListHeader, IonSegment, IonSegmentButton,
  IonTitle, IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { callOutline, logOutOutline, mailOutline, personCircleOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import { ModoTema, TemaService } from '../../core/services/tema.service';
import { UiService } from '../../core/services/ui.service';

/** Perfil del usuario logueado (GET /auth/me). Se usa en los tres módulos. */
@Component({
  selector: 'app-perfil',
  templateUrl: 'perfil.page.html',
  styleUrls: ['perfil.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonListHeader, IonItem, IonLabel, IonIcon, IonButton, IonSegment,
    IonSegmentButton,
  ],
})
export class PerfilPage {
  private auth = inject(AuthService);
  private ui = inject(UiService);
  tema = inject(TemaService);
  usuario = this.auth.usuario;
  rol = computed(() => ({ admin: 'Administrador', client: 'Pasajero', driver: 'Conductor' })[this.usuario()?.role ?? 'client']);

  constructor() {
    addIcons({ logOutOutline, mailOutline, personCircleOutline, callOutline, shieldCheckmarkOutline });
  }

  ngOnInit(): void {
    this.auth.refrescarPerfil().subscribe({ error: () => undefined });
  }

  cambiarTema(valor: unknown): void {
    this.tema.cambiar(valor as ModoTema);
  }

  async cerrarSesion(): Promise<void> {
    if (await this.ui.confirmar('Cerrar sesión', '¿Seguro que quieres salir?')) {
      this.auth.logout();
    }
  }
}
