import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { TemaService } from './core/services/tema.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  // Se crea al arrancar para aplicar el tema guardado (oscuro por defecto) antes de mostrar nada
  private tema = inject(TemaService);
}
