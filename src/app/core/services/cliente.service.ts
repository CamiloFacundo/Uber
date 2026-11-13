import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Estimacion, Lista, Lugar, SolicitudViaje, Tarifa, Viaje, ViajeActivo, aArreglo } from '../models/models';
import { ApiService } from './api.service';
import { TipoServicio } from '../../shared/categorias';

/** Endpoints del módulo cliente: /api/client/* (requieren token con rol client). */
@Injectable({ providedIn: 'root' })
export class ClienteService {
  private api = inject(ApiService);

  // GET /fares/active  (público)
  tarifaActiva(): Observable<Tarifa> {
    return this.api.get<{ fare: Tarifa }>('fares/active').pipe(map((r) => r.fare));
  }

  // POST /client/estimate-fare
  estimar(origen: Lugar, destino: Lugar): Observable<Estimacion> {
    return this.api
      .post<{ estimate: Estimacion }>('client/estimate-fare', {
        origin_latitude: origen.lat,
        origin_longitude: origen.lng,
        destination_latitude: destino.lat,
        destination_longitude: destino.lng,
      })
      .pipe(map((r) => r.estimate));
  }

  // POST /client/ride-requests   (400 si ya tiene un viaje activo)
  // service_type (moto, eco, confort, plus, van) y payment_method son extras de AUREN; el backend puede ignorarlos.
  solicitar(
    origen: Lugar,
    destino: Lugar,
    service_type: TipoServicio = 'confort',
    payment_method: string = 'efectivo',
  ): Observable<SolicitudViaje> {
    return this.api
      .post<{ ride_request: SolicitudViaje }>('client/ride-requests', {
        origin_name: origen.nombre,
        origin_latitude: origen.lat,
        origin_longitude: origen.lng,
        destination_name: destino.nombre,
        destination_latitude: destino.lat,
        destination_longitude: destino.lng,
        service_type,
        payment_method,
      })
      .pipe(map((r) => r.ride_request));
  }

  // GET /client/active  (solicitud o viaje en curso, con conductor, vehículo y GPS)
  activo(): Observable<ViajeActivo> {
    return this.api.get<ViajeActivo>('client/active');
  }

  // POST /client/cancel/{id}  { reason }
  cancelar(id: number, reason: string): Observable<string> {
    return this.api.post<{ message: string }>(`client/cancel/${id}`, { reason }).pipe(map((r) => r.message));
  }

  // GET /client/trips  (historial paginado)
  historial(): Observable<Viaje[]> {
    return this.api.get<{ trips: Lista<Viaje> }>('client/trips').pipe(map((r) => aArreglo(r.trips)));
  }

  // POST /client/trips/{id}/rating  { score, comment, has_incident }
  calificar(id: number, score: number, comment: string, has_incident: boolean): Observable<string> {
    return this.api
      .post<{ message: string }>(`client/trips/${id}/rating`, { score, comment, has_incident })
      .pipe(map((r) => r.message));
  }
}
