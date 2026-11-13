import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader } from '@ionic/angular';
import { Tarifa } from '../../core/models/models';
import { AdminDatosService, conductorDeViaje, fechaViaje, ingresoViaje } from '../../core/services/admin-datos.service';
import { AdminService } from '../../core/services/admin.service';
import { UiService } from '../../core/services/ui.service';
import { AdminBarraComponent } from '../barra/admin-barra.component';

const DIA = 86400000;

/**
 * Pagos: ingresos, comisión de la plataforma, lo que corresponde a cada conductor y tarifas.
 * Tarifas: GET y POST /admin/fares. La comisión no viene de la API (se configura en este panel).
 */
@Component({
  selector: 'app-admin-pagos',
  imports: [CurrencyPipe, DecimalPipe, ReactiveFormsModule, RouterLink, IonHeader, IonContent, AdminBarraComponent],
  template: `
    <ion-header class="ion-no-border"><app-admin-barra></app-admin-barra></ion-header>
    <ion-content class="admin-pagina">
      <div class="admin-contenido">
        <div class="admin-titulo">
          <div>
            <h1>Pagos</h1>
            <p>Ingresos, comisiones y tarifas</p>
          </div>
          <select class="admin-select" [value]="periodo()" (change)="periodo.set(+$any($event.target).value)" aria-label="Periodo">
            <option value="7">Últimos 7 días</option>
            <option value="30">Últimos 30 días</option>
            <option value="90">Últimos 90 días</option>
            <option value="3650">Todo</option>
          </select>
        </div>

        <div class="resumen">
          <div class="admin-tarjeta"><span>Ingresos de viajes</span><strong>{{ bruto() | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</strong><small>{{ completados() }} viajes completados</small></div>
          <div class="admin-tarjeta destacada"><span>Comisión AUREN ({{ datos.comision() }}%)</span><strong>{{ comision() | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</strong><small><a routerLink="/admin/configuracion">Cambiar porcentaje</a></small></div>
          <div class="admin-tarjeta"><span>Para los conductores</span><strong>{{ bruto() - comision() | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</strong><small>Ingresos menos comisión</small></div>
          <div class="admin-tarjeta"><span>Valor promedio por viaje</span><strong>{{ (completados() ? bruto() / completados() : 0) | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</strong><small>En el periodo</small></div>
        </div>

        <section class="admin-tarjeta tabla-caja">
          <div class="admin-tarjeta-cabeza cabeza-tabla"><h2>Liquidación por conductor</h2></div>
          <table>
            <thead>
              <tr>
                <th scope="col">Conductor</th>
                <th scope="col" class="derecha">Viajes</th>
                <th scope="col" class="derecha">Ingresos</th>
                <th scope="col" class="derecha">Comisión</th>
                <th scope="col" class="derecha">A pagar</th>
              </tr>
            </thead>
            <tbody>
              @for (c of liquidacion(); track c.id) {
                <tr>
                  <td><strong>{{ c.nombre }}</strong></td>
                  <td class="derecha">{{ c.viajes }}</td>
                  <td class="derecha">{{ c.ingresos | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</td>
                  <td class="derecha">{{ c.ingresos * datos.comision() / 100 | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</td>
                  <td class="derecha fuerte">{{ c.ingresos * (1 - datos.comision() / 100) | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="5" class="vacio">No hay viajes completados en el periodo.</td></tr>
              }
            </tbody>
          </table>
        </section>

        <section class="admin-tarjeta">
          <div class="admin-tarjeta-cabeza">
            <h2>Tarifas</h2>
            <button type="button" class="boton dorado" (click)="formulario.set(!formulario())">{{ formulario() ? 'Cancelar' : 'Nueva tarifa' }}</button>
          </div>

          @if (formulario()) {
            <form class="form-tarifa" [formGroup]="form" (ngSubmit)="guardar()">
              <label class="ancho">Nombre<input formControlName="name" placeholder="Tarifa Hora Pico" /></label>
              <label>Tarifa base ($)<input type="number" formControlName="base_fare" /></label>
              <label>Precio por km ($)<input type="number" formControlName="price_per_km" /></label>
              <label>Precio por minuto ($)<input type="number" formControlName="price_per_minute" /></label>
              <label>Tarifa mínima ($)<input type="number" formControlName="minimum_fare" /></label>
              <label>Multiplicador (hora pico)<input type="number" step="0.1" formControlName="surge_multiplier" /></label>
              <label class="casilla"><input type="checkbox" formControlName="active" /> Activar esta tarifa</label>
              <button type="submit" class="boton dorado ancho" [disabled]="form.invalid || guardando()">Guardar tarifa</button>
            </form>
          }

          <div class="tarifas">
            @for (t of datos.tarifas(); track t.id ?? t.name) {
              <article class="tarifa" [class.activa]="t.active">
                <div class="tarifa-cabeza">
                  <strong>{{ t.name }}</strong>
                  <span class="insignia">{{ t.active ? 'Activa' : 'Inactiva' }}</span>
                </div>
                <dl>
                  <div><dt>Base</dt><dd>{{ t.base_fare | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</dd></div>
                  <div><dt>Por km</dt><dd>{{ t.price_per_km | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</dd></div>
                  <div><dt>Por minuto</dt><dd>{{ t.price_per_minute | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</dd></div>
                  <div><dt>Mínima</dt><dd>{{ t.minimum_fare | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</dd></div>
                  <div><dt>Multiplicador</dt><dd>× {{ t.surge_multiplier | number: '1.1-2' }}</dd></div>
                </dl>
              </article>
            } @empty {
              <p class="admin-nota">No hay tarifas configuradas.</p>
            }
          </div>
          <p class="admin-nota">Las categorías (Eco, Confort, Plus y Van) multiplican la tarifa activa: ×1, ×1,35, ×1,7 y ×2,1.</p>
        </section>
      </div>
    </ion-content>
  `,
  styles: `
    h2 { margin: 0; }
    .resumen { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; }
    .resumen .admin-tarjeta { display: flex; flex-direction: column; gap: 4px; }
    .resumen span { font-size: 13px; color: var(--rd-suave); }
    .resumen strong { font-family: var(--rd-titulos); font-size: 24px; }
    .resumen small { font-size: 12px; color: var(--rd-suave); }
    .resumen a { color: var(--rd-primario-texto); font-weight: 600; }
    .destacada { border-color: var(--rd-cta); }
    .tabla-caja { padding: 0; overflow-x: auto; }
    .cabeza-tabla { padding: 18px 18px 0; }
    table { width: 100%; min-width: 600px; border-collapse: collapse; font-size: 14px; }
    th { padding: 12px 16px; text-align: left; font-family: var(--rd-titulos); font-size: 12px; font-weight: 600; color: var(--rd-suave); border-bottom: 1px solid var(--rd-linea); }
    td { padding: 12px 16px; border-bottom: 1px solid var(--rd-linea); }
    tr:last-child td { border-bottom: 0; }
    .derecha { text-align: right; }
    .fuerte { font-family: var(--rd-titulos); font-weight: 700; }
    .vacio { padding: 24px 16px; text-align: center; color: var(--rd-suave); }
    .boton { height: 40px; padding: 0 16px; border: 1px solid var(--rd-linea); border-radius: 12px; font-size: 14px; font-weight: 600; color: var(--rd-tinta); background: var(--rd-superficie); cursor: pointer; }
    .boton.dorado { border-color: transparent; color: #101827; background: var(--rd-cta); }
    .boton:disabled { opacity: 0.5; cursor: default; }
    .form-tarifa { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 18px; padding: 16px; border: 1px dashed var(--rd-linea); border-radius: 14px; }
    .form-tarifa label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--rd-suave); }
    .form-tarifa input:not([type='checkbox']) { height: 42px; padding: 0 12px; border: 1px solid var(--rd-linea); border-radius: 10px; font-family: var(--rd-letra); font-size: 15px; color: var(--rd-tinta); background: var(--rd-fondo); }
    .form-tarifa .ancho { grid-column: 1 / -1; }
    .form-tarifa .casilla { flex-direction: row; align-items: center; gap: 8px; font-size: 14px; color: var(--rd-tinta); }
    .tarifas { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
    .tarifa { padding: 14px; border: 1px solid var(--rd-linea); border-radius: 14px; }
    .tarifa.activa { border-color: var(--rd-primario); }
    .tarifa-cabeza { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
    .tarifa-cabeza strong { font-family: var(--rd-titulos); font-size: 15px; }
    .insignia { padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; color: var(--rd-suave); background: var(--rd-fondo); }
    .activa .insignia { color: var(--rd-primario-texto); background: var(--rd-primario-suave); }
    dl { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; margin: 0; }
    dt { font-size: 12px; color: var(--rd-suave); }
    dd { margin: 0; font-weight: 600; font-size: 14px; }
  `,
})
export class AdminPagosPage {
  datos = inject(AdminDatosService);
  private admin = inject(AdminService);
  private ui = inject(UiService);
  private fb = inject(FormBuilder);

  periodo = signal(30);
  formulario = signal(false);
  guardando = signal(false);

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    base_fare: [3800, [Validators.required, Validators.min(0)]],
    price_per_km: [1250, [Validators.required, Validators.min(0)]],
    price_per_minute: [250, [Validators.required, Validators.min(0)]],
    minimum_fare: [6500, [Validators.required, Validators.min(0)]],
    surge_multiplier: [1, [Validators.required, Validators.min(1)]],
    active: [true],
  });

  private delPeriodo = computed(() => {
    const desde = Date.now() - this.periodo() * DIA;
    return this.datos.viajes().filter((v) => v.status === 'completed' && fechaViaje(v).getTime() >= desde);
  });
  completados = computed(() => this.delPeriodo().length);
  bruto = computed(() => this.delPeriodo().reduce((s, v) => s + ingresoViaje(v), 0));
  comision = computed(() => (this.bruto() * this.datos.comision()) / 100);

  liquidacion = computed(() => {
    const mapa = new Map<number, { id: number; nombre: string; viajes: number; ingresos: number }>();
    for (const v of this.delPeriodo()) {
      const id = conductorDeViaje(v);
      if (id === undefined) continue;
      const nombre = v.driver?.user?.name ?? this.datos.conductores().find((c) => c.id === id)?.user.name ?? `Conductor ${id}`;
      const x = mapa.get(id) ?? { id, nombre, viajes: 0, ingresos: 0 };
      x.viajes++;
      x.ingresos += ingresoViaje(v);
      mapa.set(id, x);
    }
    return [...mapa.values()].sort((a, b) => b.ingresos - a.ingresos);
  });

  guardar(): void {
    const v = this.form.getRawValue();
    const tarifa: Tarifa = {
      ...v,
      base_fare: Number(v.base_fare),
      price_per_km: Number(v.price_per_km),
      price_per_minute: Number(v.price_per_minute),
      minimum_fare: Number(v.minimum_fare),
      surge_multiplier: Number(v.surge_multiplier),
    };
    this.guardando.set(true);
    this.admin.crearTarifa(tarifa).subscribe({
      next: (mensaje) => {
        this.guardando.set(false);
        this.ui.toast(mensaje, 'success');
        this.formulario.set(false);
        this.form.reset();
        this.datos.actualizar();
      },
      error: (err) => {
        this.guardando.set(false);
        this.ui.error(err);
      },
    });
  }
}
