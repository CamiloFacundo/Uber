import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { IonContent, IonHeader, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  callOutline, carOutline, checkmarkCircle, chevronDown, chevronUp, closeCircleOutline, idCardOutline, mailOutline,
  pauseCircleOutline, playCircleOutline, star,
} from 'ionicons/icons';
import { Conductor, EstadoAprobacion } from '../../core/models/models';
import { AdminDatosService, conductorDeViaje, ingresoViaje } from '../../core/services/admin-datos.service';
import { AdminService } from '../../core/services/admin.service';
import { UiService } from '../../core/services/ui.service';
import { ESTADO_APROBACION } from '../../shared/estado-viaje';
import { AdminBarraComponent } from '../barra/admin-barra.component';

/** Documentos que el administrador revisa antes de aprobar a un conductor */
const DOCUMENTOS = [
  'Licencia de conducción vigente',
  'SOAT vigente',
  'Revisión técnico-mecánica',
  'Tarjeta de propiedad del vehículo',
  'Antecedentes judiciales sin novedad',
];

/**
 * Conductores: registro y validación.
 * GET /admin/drivers y PATCH /admin/drivers/{id}/approval (aprobar, suspender, habilitar o rechazar).
 */
@Component({
  selector: 'app-conductores',
  templateUrl: 'conductores.page.html',
  styleUrls: ['conductores.page.scss'],
  imports: [CurrencyPipe, DecimalPipe, IonHeader, IonContent, IonIcon, AdminBarraComponent],
})
export class ConductoresPage {
  datos = inject(AdminDatosService);
  private admin = inject(AdminService);
  private ui = inject(UiService);

  /** ?q= desde la búsqueda global */
  q = input<string>('');

  aprobacion = ESTADO_APROBACION;
  documentos = DOCUMENTOS;
  filtro = signal<EstadoAprobacion | 'todos'>('pending');
  texto = signal('');
  abierto = signal<number | null>(null);
  revisados = signal<Record<number, string[]>>({});
  enviando = signal<number | null>(null);

  filtros: { id: EstadoAprobacion | 'todos'; nombre: string }[] = [
    { id: 'pending', nombre: 'Por aprobar' },
    { id: 'approved', nombre: 'Aprobados' },
    { id: 'suspended', nombre: 'Suspendidos' },
    { id: 'rejected', nombre: 'Rechazados' },
    { id: 'todos', nombre: 'Todos' },
  ];

  conteo = computed(() => {
    const c: Record<string, number> = { todos: this.datos.conductores().length };
    for (const d of this.datos.conductores()) c[d.approval_status] = (c[d.approval_status] ?? 0) + 1;
    return c;
  });

  /** Viajes completados y ganancias de cada conductor */
  private resumen = computed(() => {
    const r = new Map<number, { viajes: number; ganancias: number }>();
    for (const v of this.datos.viajes()) {
      const id = conductorDeViaje(v);
      if (id === undefined || v.status !== 'completed') continue;
      const x = r.get(id) ?? { viajes: 0, ganancias: 0 };
      x.viajes++;
      x.ganancias += ingresoViaje(v);
      r.set(id, x);
    }
    return r;
  });

  lista = computed(() => {
    const t = this.texto().trim().toLowerCase();
    return this.datos.conductores()
      .filter((c) => this.filtro() === 'todos' || c.approval_status === this.filtro())
      .filter((c) => !t || [c.user.name, c.user.email, c.license_number, ...c.vehicles.map((v) => v.plate)].some((x) => x?.toLowerCase().includes(t)))
      .map((c) => ({ ...c, ...(this.resumen().get(c.id) ?? { viajes: 0, ganancias: 0 }) }));
  });

  constructor() {
    addIcons({
      callOutline, carOutline, checkmarkCircle, chevronDown, chevronUp, closeCircleOutline, idCardOutline, mailOutline,
      pauseCircleOutline, playCircleOutline, star,
    });
    // Si llega desde la búsqueda global, muestra todos y filtra por el texto
    effect(() => {
      const q = this.q();
      if (q) {
        this.filtro.set('todos');
        this.texto.set(q);
      }
    });
  }

  alternar(id: number): void {
    this.abierto.set(this.abierto() === id ? null : id);
  }

  marcar(id: number, doc: string): void {
    const actuales = this.revisados()[id] ?? [];
    const nuevos = actuales.includes(doc) ? actuales.filter((d) => d !== doc) : [...actuales, doc];
    this.revisados.update((r) => ({ ...r, [id]: nuevos }));
  }

  documentosCompletos(id: number): boolean {
    return (this.revisados()[id] ?? []).length === DOCUMENTOS.length;
  }

  async cambiar(c: Conductor, estado: EstadoAprobacion): Promise<void> {
    const accion = { approved: c.approval_status === 'suspended' ? 'Habilitar' : 'Aprobar', suspended: 'Suspender', rejected: 'Rechazar', pending: 'Marcar pendiente' }[estado];
    const notas = await this.ui.pedirTexto(`${accion} a ${c.user.name}`, estado === 'approved' ? 'Comentario (opcional)' : 'Motivo');
    if (notas === null) return;
    const docs = this.revisados()[c.id];
    const admin_notes = [docs?.length ? `Documentos verificados: ${docs.join(', ')}` : '', notas.trim()].filter(Boolean).join('. ');
    this.enviando.set(c.id);
    this.admin.cambiarAprobacion(c.id, estado, admin_notes).subscribe({
      next: () => {
        this.enviando.set(null);
        // El mensaje del backend trae el estado en inglés ("approved"); se arma uno propio
        const hecho = { approved: accion === 'Habilitar' ? 'habilitado' : 'aprobado', suspended: 'suspendido', rejected: 'rechazado', pending: 'marcado como pendiente' }[estado];
        this.ui.toast(`${c.user.name}: ${hecho}`, 'success');
        this.datos.actualizar();
      },
      error: (err) => {
        this.enviando.set(null);
        this.ui.error(err);
      },
    });
  }
}
