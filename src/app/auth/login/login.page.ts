import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonIcon, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline, arrowForward, eyeOffOutline, eyeOutline, flashOutline, locationOutline, shieldCheckmarkOutline, starOutline,
} from 'ionicons/icons';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { UiService } from '../../core/services/ui.service';
import { LogoComponent } from '../../shared/logo/logo.component';

const CLAVE_RECORDAR = 'login_recordado';

@Component({
  selector: 'app-login',
  templateUrl: 'login.page.html',
  styleUrls: ['login.page.scss'],
  imports: [ReactiveFormsModule, RouterLink, IonContent, IonIcon, IonSpinner, LogoComponent],
})
export class LoginPage {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private ui = inject(UiService);

  cargando = signal(false);
  verClave = signal(false);
  mayusculas = signal(false);
  errorServidor = signal<string | null>(null);
  modoPrueba = environment.useMock;

  form = this.fb.nonNullable.group({
    login: [this.leerRecordado(), Validators.required], // correo o teléfono
    password: ['', Validators.required],
    recordar: [this.leerRecordado() !== ''],
  });

  constructor() {
    addIcons({ alertCircleOutline, arrowForward, eyeOffOutline, eyeOutline, flashOutline, locationOutline, shieldCheckmarkOutline, starOutline });
    // Al escribir de nuevo, el error del servidor ya no aplica
    this.form.valueChanges.subscribe(() => this.errorServidor.set(null));
  }

  /** Muestra el error de un campo solo cuando el usuario ya pasó por él. */
  invalido(campo: 'login' | 'password'): boolean {
    const c = this.form.controls[campo];
    return c.invalid && c.touched;
  }

  /** Avisa si Bloq Mayús está activado mientras escribe la contraseña. */
  revisarMayusculas(evento: KeyboardEvent): void {
    if (typeof evento.getModifierState === 'function') {
      this.mayusculas.set(evento.getModifierState('CapsLock'));
    }
  }

  ingresar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.cargando.set(true);
    this.errorServidor.set(null);
    const { login, password, recordar } = this.form.getRawValue();

    this.auth.login(login.trim(), password).subscribe({
      next: (resp) => {
        this.cargando.set(false);
        this.guardarRecordado(recordar ? login.trim() : '');
        // Cada rol va a su propio módulo
        this.router.navigateByUrl(this.auth.rutaInicio(resp.user.role), { replaceUrl: true });
      },
      error: (err) => {
        this.cargando.set(false);
        this.errorServidor.set(this.ui.mensajeError(err));
      },
    });
  }

  /** Solo en modo simulado: llena el formulario con un usuario de prueba. */
  usarCuenta(login: string, password: string): void {
    this.form.patchValue({ login, password });
  }

  private leerRecordado(): string {
    try {
      return localStorage.getItem(CLAVE_RECORDAR) ?? '';
    } catch {
      return '';
    }
  }

  private guardarRecordado(valor: string): void {
    try {
      if (valor) localStorage.setItem(CLAVE_RECORDAR, valor);
      else localStorage.removeItem(CLAVE_RECORDAR);
    } catch { /* sin almacenamiento */ }
  }
}
