// Modelos (interfaces) con los mismos nombres de campos que devuelve la API Laravel
// (ver API_DOCUMENTATION.md del profesor).

export type Rol = 'admin' | 'client' | 'driver';

export interface Usuario {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: Rol;
  status: string; // active, inactive, suspended...
}

/** Respuesta de /auth/login y /auth/register */
export interface AuthResponse {
  success: boolean;
  message: string;
  access_token: string;
  token_type: string;
  expires_in: number;
  user: Usuario;
}

export interface Vehiculo {
  plate: string;
  brand: string;
  model: string;
  color?: string;
  year?: number;
  capacity?: number;
}

export type EstadoAprobacion = 'pending' | 'approved' | 'suspended' | 'rejected';

/** Conductor tal como lo lista /admin/drivers */
export interface Conductor {
  id: number;
  license_number: string;
  approval_status: EstadoAprobacion;
  rating_average: number;
  availability_status?: 'available' | 'unavailable';
  user: { name: string; email: string; phone?: string };
  vehicles: Vehiculo[];
}

export interface Tarifa {
  id?: number;
  name: string;
  base_fare: number;
  price_per_km: number;
  price_per_minute: number;
  minimum_fare: number;
  surge_multiplier: number;
  active: boolean;
}

/** Punto en el mapa: nombre + coordenadas GPS */
export interface Lugar {
  nombre: string;
  lat: number;
  lng: number;
}

/** Respuesta de /client/estimate-fare */
export interface Estimacion {
  distance_km: number;
  duration_min: number;
  estimated_fare: number;
  currency: string;
}

/** Ciclo de vida: requested → assigned → driver_arrived → in_progress → completed (o cancelled) */
export type EstadoViaje = 'requested' | 'assigned' | 'driver_arrived' | 'in_progress' | 'completed' | 'cancelled';

/** Solicitud de viaje (antes de que un conductor la acepte) */
export interface SolicitudViaje {
  id: number;
  client_id?: number;
  origin_name: string;
  origin_latitude?: number;
  origin_longitude?: number;
  destination_name: string;
  destination_latitude?: number;
  destination_longitude?: number;
  estimated_distance_km: number;
  estimated_duration_min?: number;
  estimated_fare: number;
  status?: EstadoViaje;
  created_at?: string;
  client?: { name: string; phone?: string };
}

/** Viaje (se crea cuando el conductor acepta una solicitud). Casi todos los campos son opcionales
 *  porque cada endpoint devuelve solo una parte. */
export interface Viaje {
  id: number;
  request_id?: number;
  client_id?: number;
  driver_id?: number;
  status: EstadoViaje;
  origin_name?: string;
  destination_name?: string;
  estimated_fare?: number;
  final_fare?: number;
  created_at?: string;
  started_at?: string;
  completed_at?: string;
  client?: { name: string; phone?: string };
  driver?: {
    id?: number;
    rating_average?: number;
    user: { name: string; phone?: string };
    latest_location?: { latitude: number; longitude: number };
  };
  vehicle?: Vehiculo;
}

/** Respuesta de /client/active */
export interface ViajeActivo {
  has_active: boolean;
  type?: 'request' | 'trip';
  data?: Viaje;
}

/** Respuesta de /admin/dashboard */
export interface Estadisticas {
  total_clients: number;
  total_drivers: number;
  pending_drivers: number;
  approved_drivers: number;
  active_trips: number;
  completed_trips: number;
  cancelled_trips: number;
  pending_requests: number;
  total_revenue: number;
}

/** Algunas listas vienen paginadas por Laravel ({ data: [...] }) y otras como arreglo directo. */
export type Lista<T> = T[] | { data: T[] };

export function aArreglo<T>(lista: Lista<T> | undefined | null): T[] {
  if (!lista) return [];
  return Array.isArray(lista) ? lista : (lista.data ?? []);
}
