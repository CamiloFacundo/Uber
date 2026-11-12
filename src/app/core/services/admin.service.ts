import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Conductor, EstadoAprobacion, Estadisticas, Lista, Tarifa, Viaje, aArreglo } from '../models/models';
import { ApiService } from './api.service';

export interface Dashboard {
  stats: Estadisticas;
  recent_trips: Viaje[];
}

/** Endpoints del módulo administrador: /api/admin/* (token con rol admin). */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private api = inject(ApiService);

  // GET /admin/dashboard
  dashboard(): Observable<Dashboard> {
    return this.api
      .get<{ stats: Estadisticas; recent_trips?: Lista<Viaje> }>('admin/dashboard')
      .pipe(map((r) => ({ stats: r.stats, recent_trips: aArreglo(r.recent_trips) })));
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
}
