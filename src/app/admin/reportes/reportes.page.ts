import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { IonContent, IonHeader } from '@ionic/angular';
import { AdminDatosService, fechaViaje } from '../../core/services/admin-datos.service';
import { AdminService, RegistroAuditoria } from '../../core/services/admin.service';
import { AdminBarraComponent } from '../barra/admin-barra.component';

/** Nombres en español de los campos conocidos de GET /admin/reports */
const ETIQUETAS: Record<string, string> = {
  total_trips: 'Viajes registrados',
  completed_trips: 'Viajes completados',
  cancelled_trips: 'Viajes cancelados',
  cancellation_rate: 'Tasa de cancelación (%)',
  total_revenue: 'Ingresos totales',
  average_fare: 'Valor promedio por viaje',
};
const DINERO = ['total_revenue', 'average_fare'];

/**
 * Reportes: indicadores del servidor (GET /admin/reports), destinos y horarios con más demanda
 * (calculados con los viajes) y registro de auditoría (GET /admin/audit-logs).
 */
@Component({
  selector: 'app-admin-reportes',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, IonHeader, IonContent, AdminBarraComponent],
  template: `
    <ion-header class="ion-no-border"><app-admin-barra></app-admin-barra></ion-header>
    <ion-content class="admin-pagina">
      <div class="admin-contenido">
        <div class="admin-titulo">
          <div>
            <h1>Reportes</h1>
            <p>Estadísticas, demanda y registro de acciones administrativas</p>
          </div>
        </div>

        <section class="indicadores" aria-label="Reporte del servidor">
          @for (i of indicadores(); track i.clave) {
            <div class="admin-tarjeta">
              <span>{{ i.etiqueta }}</span>
              <strong>{{ i.dinero ? (i.valor | currency: 'COP' : 'symbol-narrow' : '1.0-0') : (i.valor | number: '1.0-1') }}</strong>
            </div>
          } @empty {
            <p class="admin-nota">{{ errorReporte() ? 'No se pudo cargar el reporte del servidor.' : 'Cargando reporte...' }}</p>
          }
        </section>

        <div class="fila">
          <section class="admin-tarjeta">
            <div class="admin-tarjeta-cabeza"><h2>Destinos más solicitados</h2></div>
            <ol class="barras">
              @for (d of destinos(); track d.nombre) {
                <li>
                  <span class="nombre">{{ d.nombre }}</span>
                  <span class="barra"><span [style.width.%]="d.porcentaje"></span></span>
                  <span class="valor">{{ d.viajes }}</span>
                </li>
              } @empty {
                <li class="admin-nota">Sin datos todavía.</li>
              }
            </ol>
          </section>

          <section class="admin-tarjeta">
            <div class="admin-tarjeta-cabeza"><h2>Horarios con más demanda</h2></div>
            <ol class="barras">
              @for (h of horas(); track h.nombre) {
                <li>
                  <span class="nombre">{{ h.nombre }}</span>
                  <span class="barra"><span [style.width.%]="h.porcentaje"></span></span>
                  <span class="valor">{{ h.viajes }}</span>
                </li>
              }
            </ol>
          </section>
        </div>

        <section class="admin-tarjeta tabla-caja">
          <div class="admin-tarjeta-cabeza cabeza-tabla"><h2>Registro de auditoría</h2></div>
          <table>
            <thead>
              <tr><th scope="col">Fecha</th><th scope="col">Usuario</th><th scope="col">Acción</th><th scope="col">Detalle</th></tr>
            </thead>
            <tbody>
              @for (r of auditoria(); track r.id) {
                <tr>
                  <td>{{ r.created_at | date: 'd MMM y, h:mm a' }}</td>
                  <td>{{ r.user ?? '—' }}</td>
                  <td><span class="accion">{{ accion(r.action) }}</span></td>
                  <td>{{ r.description ?? '' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="4" class="vacio">{{ errorAuditoria() ? 'No se pudo cargar el registro de auditoría.' : 'Sin acciones registradas.' }}</td></tr>
              }
            </tbody>
          </table>
        </section>
      </div>
    </ion-content>
  `,
  styles: `
    h2 { margin: 0; }
    .indicadores { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; }
    .indicadores .admin-tarjeta { display: flex; flex-direction: column; gap: 4px; }
    .indicadores span { font-size: 13px; color: var(--rd-suave); }
    .indicadores strong { font-family: var(--rd-titulos); font-size: 24px; }
    .fila { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 1000px) { .fila { grid-template-columns: 1fr; } }
    .barras { display: flex; flex-direction: column; gap: 12px; margin: 0; padding: 0; list-style: none; }
    .barras li { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) 36px; align-items: center; gap: 12px; font-size: 14px; }
    .nombre { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .barra { height: 10px; border-radius: 5px; background: var(--rd-fondo); overflow: hidden; }
    .barra span { display: block; height: 100%; border-radius: 5px; background: var(--rd-graf-1); }
    .valor { text-align: right; font-family: var(--rd-titulos); font-weight: 700; }
    .tabla-caja { padding: 0; overflow-x: auto; }
    .cabeza-tabla { padding: 18px 18px 0; }
    table { width: 100%; min-width: 640px; border-collapse: collapse; font-size: 14px; }
    th { padding: 12px 16px; text-align: left; font-family: var(--rd-titulos); font-size: 12px; font-weight: 600; color: var(--rd-suave); border-bottom: 1px solid var(--rd-linea); }
    td { padding: 12px 16px; border-bottom: 1px solid var(--rd-linea); }
    tr:last-child td { border-bottom: 0; }
    .accion { padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; white-space: nowrap; color: var(--rd-primario-texto); background: var(--rd-primario-suave); }
    .vacio { padding: 24px 16px; text-align: center; color: var(--rd-suave); }
  `,
})
export class AdminReportesPage {
  private datos = inject(AdminDatosService);
  private admin = inject(AdminService);

  private reporte = signal<Record<string, unknown> | null>(null);
  errorReporte = signal(false);
  auditoria = signal<RegistroAuditoria[]>([]);
  errorAuditoria = signal(false);

  indicadores = computed(() =>
    Object.entries(this.reporte() ?? {})
      .filter(([, v]) => typeof v === 'number')
      .map(([clave, valor]) => ({ clave, valor: valor as number, etiqueta: ETIQUETAS[clave] ?? clave, dinero: DINERO.includes(clave) })),
  );

  destinos = computed(() => {
    const conteo = new Map<string, number>();
    for (const v of this.datos.viajes()) {
      if (v.destination_name && v.status !== 'cancelled') conteo.set(v.destination_name, (conteo.get(v.destination_name) ?? 0) + 1);
    }
    const lista = [...conteo.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    const max = Math.max(1, ...lista.map(([, n]) => n));
    return lista.map(([nombre, viajes]) => ({ nombre, viajes, porcentaje: (viajes / max) * 100 }));
  });

  horas = computed(() => {
    const franjas = [
      { nombre: 'Madrugada (0 a 6)', desde: 0, hasta: 6 },
      { nombre: 'Mañana (6 a 12)', desde: 6, hasta: 12 },
      { nombre: 'Tarde (12 a 18)', desde: 12, hasta: 18 },
      { nombre: 'Noche (18 a 24)', desde: 18, hasta: 24 },
    ].map((f) => ({ ...f, viajes: 0 }));
    for (const v of this.datos.viajes()) {
      const h = fechaViaje(v).getHours();
      const f = franjas.find((x) => h >= x.desde && h < x.hasta);
      if (f) f.viajes++;
    }
    const max = Math.max(1, ...franjas.map((f) => f.viajes));
    return franjas.map((f) => ({ nombre: f.nombre, viajes: f.viajes, porcentaje: (f.viajes / max) * 100 }));
  });

  ngOnInit(): void {
    this.admin.reportes().subscribe({ next: (r) => this.reporte.set(r), error: () => this.errorReporte.set(true) });
    this.admin.auditoria().subscribe({ next: (l) => this.auditoria.set(l), error: () => this.errorAuditoria.set(true) });
  }

  accion(a?: string): string {
    return { 'driver.approval': 'Conductor', 'fare.create': 'Tarifa' }[a ?? ''] ?? a ?? 'Acción';
  }
}
