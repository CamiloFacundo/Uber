import { EstadoAprobacion, EstadoViaje } from '../core/models/models';

/** Texto en español y color de cada estado que manda la API, para mostrarlo igual en todos los módulos. */
export const ESTADO_VIAJE: Record<EstadoViaje, { texto: string; color: string }> = {
  requested: { texto: 'Buscando conductor', color: 'warning' },
  assigned: { texto: 'Conductor en camino', color: 'tertiary' },
  driver_arrived: { texto: 'Conductor en el punto', color: 'secondary' },
  in_progress: { texto: 'En curso', color: 'primary' },
  completed: { texto: 'Finalizado', color: 'success' },
  cancelled: { texto: 'Cancelado', color: 'medium' },
};

export const ESTADO_APROBACION: Record<EstadoAprobacion, { texto: string; color: string }> = {
  pending: { texto: 'Pendiente', color: 'warning' },
  approved: { texto: 'Aprobado', color: 'success' },
  suspended: { texto: 'Suspendido', color: 'danger' },
  rejected: { texto: 'Rechazado', color: 'medium' },
};

export function estadoViaje(estado: string): { texto: string; color: string } {
  return ESTADO_VIAJE[estado as EstadoViaje] ?? { texto: estado, color: 'medium' };
}
