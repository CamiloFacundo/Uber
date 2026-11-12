import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonBadge, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonContent, IonHeader,
  IonInput, IonItem, IonList, IonListHeader, IonTitle, IonToggle, IonToolbar,
} from '@ionic/angular';
import { Tarifa } from '../../core/models/models';
import { AdminService } from '../../core/services/admin.service';
import { UiService } from '../../core/services/ui.service';

/** Configuración de tarifas: GET y POST /admin/fares */
@Component({
  selector: 'app-tarifas',
  templateUrl: 'tarifas.page.html',
  imports: [
    CurrencyPipe, ReactiveFormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonListHeader, IonItem,
    IonInput, IonToggle, IonButton, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, IonBadge,
  ],
})
export class TarifasPage {
  private fb = inject(FormBuilder);
  private admin = inject(AdminService);
  private ui = inject(UiService);

  tarifas = signal<Tarifa[]>([]);
  mostrarFormulario = signal(false);

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    base_fare: [3800, [Validators.required, Validators.min(0)]],
    price_per_km: [1250, [Validators.required, Validators.min(0)]],
    price_per_minute: [250, [Validators.required, Validators.min(0)]],
    minimum_fare: [6500, [Validators.required, Validators.min(0)]],
    surge_multiplier: [1, [Validators.required, Validators.min(1)]],
    active: [true],
  });

  ngOnInit(): void {
    this.ionViewWillEnter();
  }

  ionViewWillEnter(): void {
    this.admin.tarifas().subscribe({
      next: (lista) => this.tarifas.set(lista),
      error: (err) => this.ui.error(err),
    });
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const tarifa: Tarifa = {
      ...v,
      base_fare: Number(v.base_fare),
      price_per_km: Number(v.price_per_km),
      price_per_minute: Number(v.price_per_minute),
      minimum_fare: Number(v.minimum_fare),
      surge_multiplier: Number(v.surge_multiplier),
    };
    this.admin.crearTarifa(tarifa).subscribe({
      next: (mensaje) => {
        this.ui.toast(mensaje, 'success');
        this.mostrarFormulario.set(false);
        this.form.reset();
        this.ionViewWillEnter();
      },
      error: (err) => this.ui.error(err),
    });
  }
}
