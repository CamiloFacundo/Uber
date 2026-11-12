import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonInput, IonItem, IonList, IonSpinner, IonTitle, IonToolbar,
} from '@ionic/angular';
import { AuthService } from '../../core/services/auth.service';
import { UiService } from '../../core/services/ui.service';
import { LogoComponent } from '../../shared/logo/logo.component';

/** Restablecer contraseña: POST /auth/forgot-password */
@Component({
  selector: 'app-recuperar',
  styleUrls: ['../auth.scss'],
  imports: [
    ReactiveFormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonList, IonItem,
    IonInput, IonButton, IonSpinner, LogoComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/login" text="Volver"></ion-back-button></ion-buttons>
        <ion-title>Restablecer contraseña</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding auth">
      <div class="logo-cabecera"><app-logo [alto]="36"></app-logo></div>
      <form [formGroup]="form" (ngSubmit)="enviar()">
        <ion-list>
          <ion-item>
            <ion-input label="Correo" labelPlacement="floating" type="email" formControlName="email" errorText="Correo no válido"></ion-input>
          </ion-item>
          <ion-item>
            <ion-input label="Nueva contraseña" labelPlacement="floating" type="password" formControlName="new_password" errorText="Mínimo 8 caracteres"></ion-input>
          </ion-item>
        </ion-list>
        <ion-button type="submit" expand="block" color="primary" [disabled]="cargando()">
          @if (cargando()) { <ion-spinner name="crescent"></ion-spinner> } @else { Guardar nueva contraseña }
        </ion-button>
      </form>
    </ion-content>
  `,
})
export class RecuperarPage {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private ui = inject(UiService);

  cargando = signal(false);
  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    new_password: ['', [Validators.required, Validators.minLength(8)]],
  });

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.cargando.set(true);
    const { email, new_password } = this.form.getRawValue();
    this.auth.restablecerClave(email, new_password).subscribe({
      next: (mensaje) => {
        this.cargando.set(false);
        this.ui.toast(mensaje, 'success');
        this.router.navigateByUrl('/login', { replaceUrl: true });
      },
      error: (err) => {
        this.cargando.set(false);
        this.ui.error(err);
      },
    });
  }
}
