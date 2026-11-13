import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonInput, IonItem, IonList, IonListHeader,
  IonSegment, IonSegmentButton, IonLabel, IonSpinner, IonTitle, IonToolbar,
} from '@ionic/angular';
import { AuthService, DatosRegistro } from '../../core/services/auth.service';
import { ConductorService } from '../../core/services/conductor.service';
import { UiService } from '../../core/services/ui.service';
import { LogoComponent } from '../../shared/logo/logo.component';

@Component({
  selector: 'app-registro',
  templateUrl: 'registro.page.html',
  styleUrls: ['../auth.scss'],
  imports: [
    ReactiveFormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonList, IonListHeader,
    IonItem, IonInput, IonButton, IonSegment, IonSegmentButton, IonLabel, IonSpinner, LogoComponent,
  ],
})
export class RegistroPage {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private conductor = inject(ConductorService);
  private router = inject(Router);
  private ui = inject(UiService);

  cargando = signal(false);

  form = this.fb.nonNullable.group({
    role: ['client' as 'client' | 'driver', Validators.required],
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^\d{7,10}$/)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    // Solo conductores
    vehicle_type: ['car' as 'car' | 'moto'],
    license_number: [''],
    plate: [''],
    brand: [''],
    model: [''],
    year: [new Date().getFullYear()],
    capacity: [4],
    color: [''],
  });

  private rol = toSignal(this.form.controls.role.valueChanges, { initialValue: this.form.controls.role.value });
  esConductor = computed(() => this.rol() === 'driver');

  registrar(): void {
    const v = this.form.getRawValue();
    const faltaVehiculo = v.role === 'driver' && (!v.license_number || !v.plate || !v.brand || !v.model || !v.color);
    if (this.form.invalid || faltaVehiculo) {
      this.form.markAllAsTouched();
      this.ui.toast('Completa todos los campos', 'danger');
      return;
    }

    const datos: DatosRegistro = { name: v.name, email: v.email, phone: v.phone, password: v.password, role: v.role };
    if (v.role === 'driver') {
      Object.assign(datos, {
        license_number: v.license_number, plate: v.plate.toUpperCase(), brand: v.brand, model: v.model,
        year: Number(v.year), capacity: v.vehicle_type === 'moto' ? 1 : Number(v.capacity), color: v.color,
        vehicle_type: v.vehicle_type,
      });
    }

    this.cargando.set(true);
    this.auth.registrar(datos).subscribe({
      next: (resp) => {
        this.cargando.set(false);
        // El backend real no devuelve el vehículo después; se guarda para mostrarlo en el perfil del conductor
        if (resp.user.role === 'driver') {
          this.conductor.recordarVehiculo(resp.user.email, {
            plate: datos.plate!, brand: datos.brand!, model: datos.model!, color: datos.color, year: datos.year,
            capacity: datos.capacity, type: datos.vehicle_type,
          });
        }
        this.ui.toast(
          resp.user.role === 'driver' ? 'Cuenta creada. Un administrador debe aprobarte antes de recibir viajes' : 'Cuenta creada',
          'success',
        );
        this.router.navigateByUrl(this.auth.rutaInicio(resp.user.role), { replaceUrl: true });
      },
      error: (err) => {
        this.cargando.set(false);
        this.ui.error(err);
      },
    });
  }
}
