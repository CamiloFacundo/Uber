import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { IonContent, IonHeader } from '@ionic/angular';
import { Viaje } from '../../core/models/models';
import { AdminDatosService, fechaViaje } from '../../core/services/admin-datos.service';
import { estadoViaje } from '../../shared/estado-viaje';
import { AdminBarraComponent } from '../barra/admin-barra.component';

type Grupo = 'activos' | 'completados' | 'cancelados' | 'todos';
const ACTIVOS = ['requested', 'assigned', 'driver_arrived', 'in_progress'];

/** Viajes: seguimiento de activos, completados y cancelados (GET /admin/trips). */
@Component({
  selector: 'app-admin-viajes',
  imports: [CurrencyPipe, DatePipe, IonHeader, IonContent, AdminBarraComponent],
  template: `
    <ion-header class="ion-no-border"><app-admin-barra></app-admin-barra></ion-header>
    <ion-content class="admin-pagina">
      <div class="admin-contenido">
        <div class="admin-titulo">
          <div>
            <h1>Viajes</h1>
            <p>Seguimiento de los viajes de la plataforma</p>
          </div>
          <input class="buscar" type="search" placeholder="Buscar por número, pasajero, conductor o destino" [value]="texto()" (input)="texto.set($any($event.target).value)" />
        </div>

        <div class="pestanas" role="tablist">
          @for (g of grupos; track g.id) {
            <button type="button" role="tab" [attr.aria-selected]="grupo() === g.id" [class.activa]="grupo() === g.id" (click)="grupo.set(g.id)">
              {{ g.nombre }} <span>{{ conteo()[g.id] }}</span>
            </button>
          }
        </div>

        <div class="admin-tarjeta tabla-caja">
          <table>
            <thead>
              <tr>
                <th scope="col">Viaje</th>
                <th scope="col">Fecha</th>
                <th scope="col">Pasajero</th>
                <th scope="col">Conductor</th>
                <th scope="col">Recorrido</th>
                <th scope="col">Estado</th>
                <th scope="col" class="derecha">Valor</th>
              </tr>
            </thead>
            <tbody>
              @for (v of lista(); track v.id) {
                <tr>
                  <td class="fuerte">#{{ v.id }}</td>
                  <td>{{ fecha(v) | date: 'd MMM, h:mm a' }}</td>
                  <td>{{ v.client?.name ?? '—' }}</td>
                  <td>
                    {{ v.driver?.user?.name ?? 'Sin asignar' }}
                    @if (v.vehicle?.plate) { <small>{{ v.vehicle!.plate }}</small> }
                  </td>
                  <td class="recorrido">{{ v.origin_name ?? '' }} → {{ v.destination_name ?? '' }}</td>
                  <td><span class="insignia" [attr.data-grupo]="grupoDe(v)">{{ estado(v).texto }}</span></td>
                  <td class="derecha fuerte">{{ (v.final_fare ?? v.estimated_fare) | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="7" class="vacio">{{ datos.cargado() ? 'No hay viajes en esta categoría.' : 'Cargando viajes...' }}</td></tr>
              }
            </tbody>
          </table>
        </div>
        @if (lista().length === limite && total() > limite) {
          <p class="admin-nota">Se muestran los {{ limite }} más recientes de {{ total() }}. Usa la búsqueda para encontrar uno en particular.</p>
        }
      </div>
    </ion-content>
  `,
  styles: `
    .buscar { width: min(420px, 100%); height: 44px; padding: 0 14px; border: 1px solid var(--rd-linea); border-radius: 12px; font-family: var(--rd-letra); font-size: 15px; color: var(--rd-tinta); background: var(--rd-superficie); outline: none; }
    .buscar:focus { border-color: var(--rd-primario); }
    .pestanas { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; }
    .pestanas button { display: inline-flex; align-items: center; gap: 8px; flex: none; height: 40px; padding: 0 14px; border: 1px solid var(--rd-linea); border-radius: 999px; font-size: 14px; font-weight: 600; color: var(--rd-tinta); background: var(--rd-superficie); cursor: pointer; }
    .pestanas button span { display: grid; place-items: center; min-width: 22px; height: 22px; padding: 0 6px; border-radius: 11px; font-size: 12px; background: var(--rd-fondo); }
    .pestanas button.activa { border-color: var(--rd-cta); color: #101827; background: var(--rd-cta); }
    .pestanas button.activa span { background: rgba(16, 24, 39, 0.15); }
    .tabla-caja { padding: 0; overflow-x: auto; }
    table { width: 100%; min-width: 820px; border-collapse: collapse; font-size: 14px; }
    th { padding: 14px 16px; text-align: left; font-family: var(--rd-titulos); font-size: 12px; font-weight: 600; color: var(--rd-suave); border-bottom: 1px solid var(--rd-linea); }
    td { padding: 12px 16px; border-bottom: 1px solid var(--rd-linea); vertical-align: middle; }
    tr:last-child td { border-bottom: 0; }
    td small { display: block; font-size: 12px; color: var(--rd-suave); }
    .fuerte { font-family: var(--rd-titulos); font-weight: 700; }
    .derecha { text-align: right; }
    .recorrido { max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--rd-suave); }
    .insignia { padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; white-space: nowrap; }
    .insignia[data-grupo='completados'] { color: var(--rd-primario-texto); background: var(--rd-primario-suave); }
    .insignia[data-grupo='activos'] { color: #8a6418; background: rgba(200, 169, 106, 0.22); }
    :host-context(.ion-palette-dark) .insignia[data-grupo='activos'] { color: #e2c88f; }
    .insignia[data-grupo='cancelados'] { color: var(--rd-alerta); background: var(--rd-alerta-suave); }
    .vacio { padding: 28px 16px; text-align: center; color: var(--rd-suave); }
  `,
})
export class AdminViajesPage {
  datos = inject(AdminDatosService);

  /** ?q= desde la búsqueda global y ?estado=activos desde el mapa del dashboard */
  q = input<string>('');
  estado$ = input<string>('', { alias: 'estado' });

  readonly limite = 100;
  grupo = signal<Grupo>('todos');
  texto = signal('');

  grupos: { id: Grupo; nombre: string }[] = [
    { id: 'activos', nombre: 'Activos' },
    { id: 'completados', nombre: 'Completados' },
    { id: 'cancelados', nombre: 'Cancelados' },
    { id: 'todos', nombre: 'Todos' },
  ];

  conteo = computed(() => {
    const v = this.datos.viajes();
    return {
      activos: v.filter((x) => ACTIVOS.includes(x.status)).length,
      completados: v.filter((x) => x.status === 'completed').length,
      cancelados: v.filter((x) => x.status === 'cancelled').length,
      todos: v.length,
    };
  });

  private filtrados = computed(() => {
    const t = this.texto().trim().toLowerCase();
    return this.datos.viajes()
      .filter((v) => this.grupo() === 'todos' || this.grupoDe(v) === this.grupo())
      .filter((v) => !t || [String(v.id), v.client?.name, v.driver?.user?.name, v.vehicle?.plate, v.origin_name, v.destination_name]
        .some((x) => x?.toLowerCase().includes(t)));
  });
  total = computed(() => this.filtrados().length);
  lista = computed(() => this.filtrados().slice(0, this.limite));

  constructor() {
    effect(() => {
      if (this.q()) this.texto.set(this.q());
      if (this.estado$() === 'activos') this.grupo.set('activos');
    });
  }

  grupoDe(v: Viaje): Grupo {
    if (v.status === 'completed') return 'completados';
    if (v.status === 'cancelled') return 'cancelados';
    return 'activos';
  }

  estado(v: Viaje) {
    return estadoViaje(v.status);
  }

  fecha(v: Viaje): Date {
    return fechaViaje(v);
  }
}
