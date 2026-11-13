import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { IonContent, IonHeader } from '@ionic/angular';
import { AdminDatosService, fechaViaje, ingresoViaje } from '../../core/services/admin-datos.service';
import { AdminBarraComponent } from '../barra/admin-barra.component';

/**
 * Usuarios (pasajeros). La API del profesor no tiene un listado de pasajeros, así que se
 * construye con los pasajeros que aparecen en los viajes (GET /admin/trips).
 */
@Component({
  selector: 'app-admin-usuarios',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, IonHeader, IonContent, AdminBarraComponent],
  template: `
    <ion-header class="ion-no-border"><app-admin-barra></app-admin-barra></ion-header>
    <ion-content class="admin-pagina">
      <div class="admin-contenido">
        <div class="admin-titulo">
          <div>
            <h1>Usuarios</h1>
            <p>Pasajeros de la plataforma y su actividad</p>
          </div>
          <input class="buscar" type="search" placeholder="Buscar pasajero" [value]="texto()" (input)="texto.set($any($event.target).value)" />
        </div>

        <div class="resumen">
          <div class="admin-tarjeta"><span>Pasajeros registrados</span><strong>{{ (datos.stats()?.total_clients ?? 0) | number }}</strong></div>
          <div class="admin-tarjeta"><span>Han viajado</span><strong>{{ pasajeros().length | number }}</strong></div>
          <div class="admin-tarjeta"><span>Gasto promedio por pasajero</span><strong>{{ promedio() | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</strong></div>
        </div>

        <div class="admin-tarjeta tabla-caja">
          <table>
            <thead>
              <tr>
                <th scope="col">Pasajero</th>
                <th scope="col" class="derecha">Viajes</th>
                <th scope="col" class="derecha">Cancelados</th>
                <th scope="col" class="derecha">Total gastado</th>
                <th scope="col">Último viaje</th>
              </tr>
            </thead>
            <tbody>
              @for (p of lista(); track p.nombre) {
                <tr>
                  <td><span class="avatar" aria-hidden="true">{{ p.nombre.charAt(0) }}</span> <strong>{{ p.nombre }}</strong></td>
                  <td class="derecha">{{ p.viajes }}</td>
                  <td class="derecha">{{ p.cancelados }}</td>
                  <td class="derecha fuerte">{{ p.gastado | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</td>
                  <td>{{ p.ultimo | date: 'd MMM y' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="5" class="vacio">{{ datos.cargado() ? 'Todavía no hay pasajeros con viajes.' : 'Cargando...' }}</td></tr>
              }
            </tbody>
          </table>
        </div>
        <p class="admin-nota">
          La API todavía no tiene un listado de pasajeros ni permite suspender sus cuentas. Aquí aparecen los pasajeros que
          han pedido viajes; cuando el backend agregue ese endpoint, esta sección mostrará a todos los registrados.
        </p>
      </div>
    </ion-content>
  `,
  styles: `
    .buscar { width: min(320px, 100%); height: 44px; padding: 0 14px; border: 1px solid var(--rd-linea); border-radius: 12px; font-family: var(--rd-letra); font-size: 15px; color: var(--rd-tinta); background: var(--rd-superficie); outline: none; }
    .resumen { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; }
    .resumen .admin-tarjeta { display: flex; flex-direction: column; gap: 4px; }
    .resumen span { font-size: 13px; color: var(--rd-suave); }
    .resumen strong { font-family: var(--rd-titulos); font-size: 24px; }
    .tabla-caja { padding: 0; overflow-x: auto; }
    table { width: 100%; min-width: 640px; border-collapse: collapse; font-size: 14px; }
    th { padding: 14px 16px; text-align: left; font-family: var(--rd-titulos); font-size: 12px; font-weight: 600; color: var(--rd-suave); border-bottom: 1px solid var(--rd-linea); }
    td { padding: 12px 16px; border-bottom: 1px solid var(--rd-linea); }
    tr:last-child td { border-bottom: 0; }
    .derecha { text-align: right; }
    .fuerte { font-family: var(--rd-titulos); font-weight: 700; }
    .avatar { display: inline-grid; place-items: center; width: 32px; height: 32px; margin-right: 8px; border-radius: 50%; font-family: var(--rd-titulos); font-weight: 700; color: #101827; background: #c8a96a; vertical-align: middle; }
    .vacio { padding: 28px 16px; text-align: center; color: var(--rd-suave); }
  `,
})
export class AdminUsuariosPage {
  datos = inject(AdminDatosService);
  texto = signal('');

  pasajeros = computed(() => {
    const mapa = new Map<string, { nombre: string; viajes: number; cancelados: number; gastado: number; ultimo: Date }>();
    for (const v of this.datos.viajes()) {
      const nombre = v.client?.name;
      if (!nombre) continue;
      const p = mapa.get(nombre) ?? { nombre, viajes: 0, cancelados: 0, gastado: 0, ultimo: new Date(0) };
      if (v.status === 'cancelled') p.cancelados++;
      else p.viajes++;
      p.gastado += ingresoViaje(v);
      const f = fechaViaje(v);
      if (f > p.ultimo) p.ultimo = f;
      mapa.set(nombre, p);
    }
    return [...mapa.values()].sort((a, b) => b.gastado - a.gastado);
  });

  lista = computed(() => {
    const t = this.texto().trim().toLowerCase();
    return this.pasajeros().filter((p) => !t || p.nombre.toLowerCase().includes(t));
  });

  promedio = computed(() => {
    const p = this.pasajeros();
    return p.length ? p.reduce((s, x) => s + x.gastado, 0) / p.length : 0;
  });
}
