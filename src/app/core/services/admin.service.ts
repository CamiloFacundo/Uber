import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Conductor, EstadoAprobacion, Estadisticas, Lista, Tarifa, Viaje, aArreglo } from '../models/models';
import { ApiService } from './api.service';

/** Incidencia reportada por un pasajero al calificar (has_incident) */
export interface Incidencia {
  id: number;
  trip_id?: number;
  description?: string;
  score?: number;
  created_at?: string;
  client?: string;
  driver?: string;
}

export interface Dashboard {
  stats: Estadisticas;
  recent_trips: Viaje[];
  recent_incidents: Incidencia[];
}

/** Registro de auditoría (RF-ADM-15) */
export interface RegistroAuditoria {
  id: number;
  action?: string;
  description?: string;
  user?: string;
  created_at?: string;
}

/** Endpoints del módulo administrador: /api/admin/* (token con rol admin). */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private api = inject(ApiService);

  // GET /admin/dashboard
  dashboard(): Observable<Dashboard> {
    return this.api
      .get<{ stats: Estadisticas; recent_trips?: Lista<Viaje>; recent_incidents?: Lista<Incidencia> }>('admin/dashboard')
      .pipe(
        map((r) => ({
          stats: r.stats,
          recent_trips: aArreglo(r.recent_trips),
          recent_incidents: aArreglo(r.recent_incidents),
        })),
      );
  }

  // GET /admin/drivers?approval_status=pending
  conductores(approval_status?: EstadoAprobacion): Observable<Conductor[]> {
    const params = approval_status ? { approval_status } : undefined;
    return this.api.get<{ drivers: Lista<Conductor> }>('admin/drivers', params).pipe(map((r) => aArreglo(r.drivers)));
  }

  // PATCH /admin/drivers/{id}/approval  { approval_status, admin_notes }
  cambiarAprobacion(id: number, approval_status: EstadoAprobacion, admin_notes: string): Observable<string> {
    return this.api
      .patch<{ message: string }>(`admin/drivers/${id}/approval`, { approval_status, admin_notes })
      .pipe(map((r) => r.message));
  }

  // GET /admin/trips?status=completed
  viajes(status?: string): Observable<Viaje[]> {
    const params = status ? { status } : undefined;
    return this.api.get<{ trips: Lista<Viaje> }>('admin/trips', params).pipe(map((r) => aArreglo(r.trips)));
  }

  // GET /admin/fares
  tarifas(): Observable<Tarifa[]> {
    return this.api.get<{ fares: Lista<Tarifa> }>('admin/fares').pipe(map((r) => aArreglo(r.fares)));
  }

  // POST /admin/fares
  crearTarifa(tarifa: Tarifa): Observable<string> {
    return this.api.post<{ message: string }>('admin/fares', tarifa).pipe(map((r) => r.message));
  }

  // GET /admin/reports  (la documentación no detalla la respuesta: se devuelve tal cual)
  reportes(): Observable<Record<string, unknown>> {
    return this.api
      .get<Record<string, unknown>>('admin/reports')
      .pipe(map((r) => (r['report'] as Record<string, unknown>) ?? r));
  }

  // GET /admin/audit-logs
  auditoria(): Observable<RegistroAuditoria[]> {
    return this.api
      .get<{ logs?: Lista<RegistroAuditoria>; audit_logs?: Lista<RegistroAuditoria> }>('admin/audit-logs')
      .pipe(map((r) => aArreglo(r.logs ?? r.audit_logs)));
  }
}
