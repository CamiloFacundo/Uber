import { HttpErrorResponse, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, delay, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LUGARES } from '../../shared/lugares';

/**
 * BACKEND SIMULADO (solo cuando environment.useMock = true).
 * Intercepta las peticiones a la API y responde con la MISMA forma que el backend Laravel del profesor,
 * guardando los datos en localStorage. Sirve para probar y presentar la app sin conexión al servidor.
 * Los servicios no saben si hablan con el servidor real o con este simulador.
 */

interface MockUser { id: number; name: string; email: string; phone: string; role: 'admin' | 'client' | 'driver'; status: string; password: string }
interface MockDriver {
  id: number; user_id: number; license_number: string; approval_status: string; rating_average: number;
  availability_status: string; vehicles: { plate: string; brand: string; model: string; year: number; capacity: number; color: string; type?: 'car' | 'moto' }[];
}
interface MockRequest {
  id: number; client_id: number; origin_name: string; origin_latitude: number; origin_longitude: number;
  destination_name: string; destination_latitude: number; destination_longitude: number;
  estimated_distance_km: number; estimated_duration_min: number; estimated_fare: number; status: string; created_at: string;
  service_type?: string; payment_method?: string;
}
interface MockTrip {
  id: number; request_id: number; client_id: number; driver_id: number; status: string; estimated_fare: number;
  final_fare?: number; created_at: string; driver_arrived_at?: string; started_at?: string; completed_at?: string; rated?: boolean;
  score?: number; comment?: string; has_incident?: boolean;
  /** Simulador: de dónde sale el conductor hacia la recogida */
  sim_inicio?: { latitude: number; longitude: number };
}
interface MockAudit { id: number; action: string; description: string; user: string; created_at: string }
interface MockFare { id: number; name: string; base_fare: number; price_per_km: number; price_per_minute: number; minimum_fare: number; surge_multiplier: number; active: boolean }
interface MockDb {
  users: MockUser[]; drivers: MockDriver[]; requests: MockRequest[]; trips: MockTrip[]; fares: MockFare[];
  locations: Record<number, { latitude: number; longitude: number }>;
  audit: MockAudit[];
}

const DB_INICIAL: MockDb = {
  users: [
    { id: 1, name: 'Administrador', email: 'admin@uber.com', phone: '3000000000', role: 'admin', status: 'active', password: 'admin123' },
    { id: 2, name: 'Juan Pérez', email: 'cliente@uber.com', phone: '3001234567', role: 'client', status: 'active', password: 'cliente123' },
    { id: 3, name: 'Carlos Rodríguez', email: 'conductor@uber.com', phone: '3119876543', role: 'driver', status: 'active', password: 'conductor123' },
    { id: 4, name: 'Andrés Torres', email: 'andres@uber.com', phone: '3157778899', role: 'driver', status: 'active', password: 'andres123' },
    { id: 5, name: 'Laura Gómez', email: 'laura@uber.com', phone: '3012223344', role: 'driver', status: 'active', password: 'laura123' },
    { id: 6, name: 'Diego Torres', email: 'diego@uber.com', phone: '3185556677', role: 'driver', status: 'active', password: 'diego123' },
    { id: 7, name: 'Sofía Ruiz', email: 'sofia@uber.com', phone: '3201112233', role: 'driver', status: 'active', password: 'sofia123' },
    { id: 8, name: 'María Cárdenas', email: 'maria@uber.com', phone: '3104445566', role: 'client', status: 'active', password: 'maria123' },
    { id: 9, name: 'Felipe Ortiz', email: 'felipe@uber.com', phone: '3167778899', role: 'client', status: 'active', password: 'felipe123' },
    { id: 10, name: 'Valentina Rojas', email: 'valentina@uber.com', phone: '3009990011', role: 'client', status: 'active', password: 'valentina123' },
  ],
  drivers: [
    {
      id: 1, user_id: 3, license_number: 'LC-55120-CO', approval_status: 'approved', rating_average: 4.95, availability_status: 'unavailable',
      vehicles: [{ plate: 'UBR-123', brand: 'Chevrolet', model: 'Onix Turbo', year: 2023, capacity: 4, color: 'Gris Plata' }],
    },
    {
      id: 2, user_id: 4, license_number: 'LC-11928-CO', approval_status: 'pending', rating_average: 5, availability_status: 'unavailable',
      vehicles: [{ plate: 'NEW-456', brand: 'Kia', model: 'Rio', year: 2024, capacity: 4, color: 'Blanco' }],
    },
    {
      id: 3, user_id: 5, license_number: 'LC-77310-CO', approval_status: 'approved', rating_average: 4.9, availability_status: 'available',
      vehicles: [{ plate: 'JKL-789', brand: 'Renault', model: 'Logan', year: 2022, capacity: 4, color: 'Gris' }],
    },
    {
      id: 4, user_id: 6, license_number: 'LC-40021-CO', approval_status: 'approved', rating_average: 4.7, availability_status: 'available',
      vehicles: [{ plate: 'MNO24F', brand: 'Yamaha', model: 'NMAX 155', year: 2023, capacity: 1, color: 'Azul', type: 'moto' }],
    },
    {
      id: 5, user_id: 7, license_number: 'LC-90877-CO', approval_status: 'suspended', rating_average: 3.9, availability_status: 'unavailable',
      vehicles: [{ plate: 'PQR-135', brand: 'Hyundai', model: 'Accent', year: 2019, capacity: 4, color: 'Negro' }],
    },
  ],
  requests: [],
  trips: [],
  fares: [
    { id: 1, name: 'Tarifa Estándar Urbana', base_fare: 3800, price_per_km: 1250, price_per_minute: 250, minimum_fare: 6500, surge_multiplier: 1, active: true },
  ],
  locations: {
    3: { latitude: 2.9361, longitude: -75.2860 },
    4: { latitude: 2.9302, longitude: -75.2921 },
  },
  audit: [],
};

/**
 * Historial de prueba: ~70 viajes de los últimos 4 meses entre lugares de Neiva, para que el panel
 * del administrador tenga datos que mostrar. Solo existe en el simulador.
 */
function generarHistorial(db: MockDb): void {
  let semilla = 7;
  const azar = () => ((semilla = (semilla * 9301 + 49297) % 233280) / 233280);
  const clientes = [2, 8, 9, 10];
  const conductores = [1, 3, 4, 5];
  const tarifa = db.fares[0];
  const ahoraMs = Date.now();
  for (let i = 0; i < 70; i++) {
    const o = LUGARES[Math.floor(azar() * LUGARES.length)];
    let d = LUGARES[Math.floor(azar() * LUGARES.length)];
    if (d === o) d = LUGARES[(LUGARES.indexOf(o) + 3) % LUGARES.length];
    const km = Math.max(0.8, haversine(o.lat, o.lng, d.lat, d.lng) * 1.3);
    const min = Math.max(3, Math.round(km * 2.5));
    // más viajes en semanas recientes, para que las gráficas muestren tendencia al alza
    const diasAtras = Math.floor(Math.pow(azar(), 1.6) * 120);
    const fecha = new Date(ahoraMs - diasAtras * 86400000 - Math.floor(azar() * 12) * 3600000);
    const cancelado = azar() < 0.1;
    const precio = calcularTarifa(tarifa, km, min) * ([1, 1, 1.35, 1.7][Math.floor(azar() * 4)]);
    const req: MockRequest = {
      id: i + 1, client_id: clientes[Math.floor(azar() * clientes.length)], origin_name: o.nombre, origin_latitude: o.lat,
      origin_longitude: o.lng, destination_name: d.nombre, destination_latitude: d.lat, destination_longitude: d.lng,
      estimated_distance_km: Math.round(km * 100) / 100, estimated_duration_min: min, estimated_fare: Math.round(precio / 100) * 100,
      status: cancelado ? 'cancelled' : 'completed', created_at: fecha.toISOString(),
    };
    db.requests.push(req);
    const viaje: MockTrip = {
      id: i + 1, request_id: req.id, client_id: req.client_id, driver_id: conductores[Math.floor(azar() * conductores.length)],
      status: cancelado ? 'cancelled' : 'completed', estimated_fare: req.estimated_fare, created_at: fecha.toISOString(),
    };
    if (!cancelado) {
      viaje.final_fare = req.estimated_fare;
      viaje.completed_at = new Date(fecha.getTime() + min * 60000).toISOString();
      if (azar() < 0.6) {
        viaje.rated = true;
        viaje.score = azar() < 0.85 ? 5 : 3;
        if (azar() < 0.08) {
          viaje.has_incident = true;
          viaje.score = 2;
          viaje.comment = 'El conductor tomó una ruta más larga de lo normal.';
        }
      }
    }
    db.trips.push(viaje);
  }
  db.trips.sort((a, b) => a.created_at.localeCompare(b.created_at));
  db.trips.forEach((t, i) => {
    const req = db.requests.find((x) => x.id === t.request_id)!;
    t.id = i + 1;
    req.id = 1000 + i;
    t.request_id = req.id;
  });
  db.audit.push({
    id: 1, action: 'driver.approval', description: 'Sofía Ruiz suspendida: varias quejas de pasajeros', user: 'Administrador',
    created_at: new Date(ahoraMs - 5 * 86400000).toISOString(),
  });
}
generarHistorial(DB_INICIAL);

const CLAVE = 'mock_backend_db';

function leerDb(): MockDb {
  try {
    const g = localStorage.getItem(CLAVE);
    if (g) {
      const db = JSON.parse(g) as MockDb;
      db.audit ??= []; // datos guardados por versiones anteriores del simulador
      // versiones anteriores no tenían conductores en moto: Diego pasa a AUREN Moto
      if (!db.drivers.some((d) => d.vehicles[0]?.type === 'moto')) {
        const diego = db.drivers.find((d) => d.id === 4);
        if (diego) diego.vehicles = [{ plate: 'MNO24F', brand: 'Yamaha', model: 'NMAX 155', year: 2023, capacity: 1, color: 'Azul', type: 'moto' }];
      }
      return db;
    }
  } catch { /* usar inicial */ }
  return structuredClone(DB_INICIAL);
}

function guardarDb(db: MockDb): void {
  try { localStorage.setItem(CLAVE, JSON.stringify(db)); } catch { /* sin almacenamiento */ }
}

const ahora = () => new Date().toISOString();
const sigId = (lista: { id: number }[]) => Math.max(0, ...lista.map((x) => x.id)) + 1;

/** Fórmula de Haversine: distancia en km entre dos coordenadas (la misma que usa el backend). */
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const rad = (g: number) => (g * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function calcularTarifa(fare: MockFare, km: number, min: number): number {
  const valor = (fare.base_fare + km * fare.price_per_km + min * fare.price_per_minute) * fare.surge_multiplier;
  return Math.round(Math.max(valor, fare.minimum_fare) / 50) * 50;
}

// ---------- Respuestas ----------
type Resp = Observable<HttpResponse<unknown>>;
const ok = (body: object, status = 200): Resp => of(new HttpResponse({ status, body: { success: true, ...body } })).pipe(delay(250));
const falla = (status: number, message: string, extra: object = {}): Resp =>
  throwError(() => new HttpErrorResponse({ status, error: { success: false, message, ...extra } }));

// ---------- Rutas ----------
type Contexto = { req: HttpRequest<unknown>; body: any; db: MockDb; user?: MockUser; params: string[] };
type Manejador = (c: Contexto) => Resp;
interface Ruta { metodo: string; patron: RegExp; rol?: MockUser['role'] | 'auth'; fn: Manejador }

function usuarioPublico(u: MockUser) {
  return { id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, status: u.status };
}

function sesion(u: MockUser, message: string, status = 200): Resp {
  return ok({ message, access_token: `mock-token-${u.id}`, token_type: 'bearer', expires_in: 3600, user: usuarioPublico(u) }, status);
}

function conductorDe(db: MockDb, user: MockUser): MockDriver | undefined {
  return db.drivers.find((d) => d.user_id === user.id);
}

function viajeConDetalle(db: MockDb, t: MockTrip) {
  const r = db.requests.find((x) => x.id === t.request_id);
  const d = db.drivers.find((x) => x.id === t.driver_id);
  const du = d && db.users.find((u) => u.id === d.user_id);
  const cu = db.users.find((u) => u.id === t.client_id);
  return {
    ...t,
    origin_name: r?.origin_name,
    destination_name: r?.destination_name,
    client: cu ? { name: cu.name, phone: cu.phone } : undefined,
    driver: d && du ? {
      id: d.id, rating_average: d.rating_average, user: { name: du.name, phone: du.phone },
      latest_location: posicionSimulada(db, t, r, d.id),
    } : undefined,
    vehicle: d?.vehicles[0],
  };
}

const RUTAS: Ruta[] = [
  // ----- Autenticación -----
  {
    metodo: 'POST', patron: /^auth\/login$/, fn: ({ body, db }) => {
      const u = db.users.find((x) => (x.email === body.login?.toLowerCase() || x.phone === body.login) && x.password === body.password);
      if (!u) return falla(401, 'Credenciales incorrectas');
      if (u.status !== 'active') return falla(403, 'Su cuenta se encuentra inactiva o suspendida');
      return sesion(u, 'Inicio de sesión exitoso');
    },
  },
  {
    metodo: 'POST', patron: /^auth\/register$/, fn: ({ body, db }) => {
      if (db.users.some((u) => u.email === body.email?.toLowerCase())) {
        return falla(422, 'Error de validación', { errors: { email: ['El correo ya está registrado.'] } });
      }
      const u: MockUser = { id: sigId(db.users), name: body.name, email: body.email.toLowerCase(), phone: body.phone, role: body.role, status: 'active', password: body.password };
      db.users.push(u);
      if (u.role === 'driver') {
        db.drivers.push({
          id: sigId(db.drivers), user_id: u.id, license_number: body.license_number, approval_status: 'pending', rating_average: 5,
          availability_status: 'unavailable',
          vehicles: [{
            plate: body.plate, brand: body.brand, model: body.model, year: body.year, capacity: body.capacity, color: body.color,
            type: body.vehicle_type === 'moto' ? 'moto' : 'car',
          }],
        });
      }
      return sesion(u, 'Usuario registrado exitosamente', 201);
    },
  },
  {
    // Extra del simulador: a un conductor también le devuelve su licencia, aprobación y vehículo.
    // El backend real solo devuelve "user"; la app funciona igual sin "driver".
    metodo: 'GET', patron: /^auth\/me$/, rol: 'auth', fn: ({ user, db }) => {
      const d = user!.role === 'driver' ? conductorDe(db, user!) : undefined;
      return ok({
        user: usuarioPublico(user!),
        ...(d ? { driver: { license_number: d.license_number, approval_status: d.approval_status, rating_average: d.rating_average, vehicles: d.vehicles } } : {}),
      });
    },
  },
  { metodo: 'POST', patron: /^auth\/logout$/, rol: 'auth', fn: () => ok({ message: 'Sesión cerrada exitosamente' }) },
  {
    metodo: 'POST', patron: /^auth\/forgot-password$/, fn: ({ body, db }) => {
      const u = db.users.find((x) => x.email === body.email?.toLowerCase());
      if (!u) return falla(404, 'No existe un usuario con ese correo');
      u.password = body.new_password;
      return ok({ message: 'Contraseña restablecida exitosamente. Ya puede iniciar sesión con su nueva clave.' });
    },
  },
  { metodo: 'GET', patron: /^fares\/active$/, fn: ({ db }) => ok({ fare: db.fares.find((f) => f.active) }) },

  // ----- Cliente -----
  {
    metodo: 'POST', patron: /^client\/estimate-fare$/, rol: 'client', fn: ({ body, db }) => {
      const km = haversine(body.origin_latitude, body.origin_longitude, body.destination_latitude, body.destination_longitude);
      const min = Math.max(1, Math.round(km * 2.5));
      const fare = db.fares.find((f) => f.active)!;
      return ok({
        estimate: {
          distance_km: Math.round(km * 100) / 100, duration_min: min, estimated_fare: calcularTarifa(fare, km, min), currency: 'COP',
          fare_breakdown: fare,
        },
      });
    },
  },
  {
    metodo: 'POST', patron: /^client\/ride-requests$/, rol: 'client', fn: ({ body, db, user }) => {
      const activa = db.requests.find((r) => r.client_id === user!.id && r.status === 'requested')
        ?? db.trips.find((t) => t.client_id === user!.id && ['assigned', 'driver_arrived', 'in_progress'].includes(t.status));
      if (activa) return falla(400, 'Ya cuenta con una solicitud o viaje activo en curso.', { active_request_id: activa.id });
      const km = haversine(body.origin_latitude, body.origin_longitude, body.destination_latitude, body.destination_longitude);
      const min = Math.max(1, Math.round(km * 2.5));
      const factor = factorServicio(body.service_type);
      const base = calcularTarifa(db.fares.find((f) => f.active)!, km, min);
      const r: MockRequest = {
        id: sigId(db.requests), client_id: user!.id, ...body, estimated_distance_km: Math.round(km * 100) / 100,
        estimated_duration_min: min, estimated_fare: Math.round((base * factor) / 100) * 100, status: 'requested', created_at: ahora(),
      };
      db.requests.push(r);
      return ok({ message: 'Solicitud de viaje creada exitosamente. Buscando conductores disponibles...', ride_request: r }, 201);
    },
  },
  {
    metodo: 'GET', patron: /^client\/active$/, rol: 'client', fn: ({ db, user }) => {
      const t = db.trips.find((x) => x.client_id === user!.id && ['assigned', 'driver_arrived', 'in_progress'].includes(x.status));
      if (t) return ok({ has_active: true, type: 'trip', data: viajeConDetalle(db, t) });
      const r = db.requests.find((x) => x.client_id === user!.id && x.status === 'requested');
      if (r) return ok({ has_active: true, type: 'request', data: r });
      return ok({ has_active: false });
    },
  },
  {
    metodo: 'POST', patron: /^client\/cancel\/(\d+)$/, rol: 'client', fn: ({ db, user, params }) => {
      const id = Number(params[0]);
      const r = db.requests.find((x) => x.id === id && x.client_id === user!.id && x.status === 'requested');
      const t = db.trips.find((x) => x.id === id && x.client_id === user!.id && ['assigned', 'driver_arrived'].includes(x.status));
      if (!r && !t) return falla(400, 'Solo se pueden cancelar solicitudes o viajes que no han iniciado');
      if (r) r.status = 'cancelled';
      if (t) {
        t.status = 'cancelled';
        const d = db.drivers.find((x) => x.id === t.driver_id);
        if (d) d.availability_status = 'available';
      }
      return ok({ message: 'Solicitud cancelada exitosamente' });
    },
  },
  {
    metodo: 'GET', patron: /^client\/trips$/, rol: 'client', fn: ({ db, user }) => ok({
      trips: { data: db.trips.filter((t) => t.client_id === user!.id).reverse().map((t) => viajeConDetalle(db, t)) },
    }),
  },
  {
    metodo: 'POST', patron: /^client\/trips\/(\d+)\/rating$/, rol: 'client', fn: ({ db, user, params, body }) => {
      const t = db.trips.find((x) => x.id === Number(params[0]) && x.client_id === user!.id);
      if (!t) return falla(404, 'Viaje no encontrado');
      if (t.status !== 'completed') return falla(400, 'Solo se pueden calificar viajes finalizados');
      if (t.rated) return falla(400, 'Este viaje ya fue calificado');
      t.rated = true;
      t.score = body.score;
      t.comment = body.comment;
      t.has_incident = !!body.has_incident;
      const d = db.drivers.find((x) => x.id === t.driver_id);
      if (d) d.rating_average = Math.round(((d.rating_average * 9 + body.score) / 10) * 100) / 100;
      return ok({
        message: 'Calificación enviada exitosamente. ¡Gracias por sus comentarios!',
        rating: { id: t.id, trip_id: t.id, score: body.score, comment: body.comment },
      }, 201);
    },
  },

  // ----- Conductor -----
  {
    metodo: 'PUT', patron: /^driver\/availability$/, rol: 'driver', fn: ({ db, user, body }) => {
      const d = conductorDe(db, user!)!;
      if (d.approval_status !== 'approved') {
        return falla(403, 'Solo conductores aprobados pueden activar su disponibilidad.', { approval_status: d.approval_status });
      }
      d.availability_status = body.status;
      return ok({ message: `Disponibilidad cambiada a: ${body.status}`, availability_status: body.status });
    },
  },
  {
    metodo: 'GET', patron: /^driver\/ride-requests$/, rol: 'driver', fn: ({ db, user }) => {
      const d = conductorDe(db, user!)!;
      if (d.approval_status !== 'approved') return falla(403, 'Su cuenta de conductor aún no ha sido aprobada.');
      // Compatibilidad AUREN: una moto solo ve servicios Moto; un carro, los demás
      const esMoto = d.vehicles[0]?.type === 'moto';
      return ok({
        requests: db.requests.filter((r) => r.status === 'requested' && (r.service_type === 'moto') === esMoto).map((r) => {
          const c = db.users.find((u) => u.id === r.client_id)!;
          return { ...r, client: { name: c.name, phone: c.phone } };
        }),
      });
    },
  },
  {
    metodo: 'POST', patron: /^driver\/ride-requests\/(\d+)\/accept$/, rol: 'driver', fn: ({ db, user, params }) => {
      const r = db.requests.find((x) => x.id === Number(params[0]));
      if (!r || r.status !== 'requested') return falla(409, 'Lo sentimos, este servicio ya fue tomado por otro conductor o fue cancelado.');
      const d = conductorDe(db, user!)!;
      if ((r.service_type === 'moto') !== (d.vehicles[0]?.type === 'moto')) return falla(422, 'Tu vehículo no es compatible con este tipo de servicio.');
      r.status = 'assigned';
      d.availability_status = 'unavailable';
      const t: MockTrip = {
        id: sigId(db.trips), request_id: r.id, client_id: r.client_id, driver_id: d.id, status: 'assigned', estimated_fare: r.estimated_fare, created_at: ahora(),
        sim_inicio: inicioSimulado(db.locations[d.id], r),
      };
      db.trips.push(t);
      return ok({ message: 'Servicio aceptado exitosamente', trip: t });
    },
  },
  {
    metodo: 'POST', patron: /^driver\/trips\/(\d+)\/(arrive|start)$/, rol: 'driver', fn: ({ db, params }) => {
      const t = db.trips.find((x) => x.id === Number(params[0]));
      if (!t) return falla(404, 'Viaje no encontrado');
      if (params[1] === 'arrive') {
        if (t.status !== 'assigned') return falla(400, 'El viaje no está en estado asignado');
        t.status = 'driver_arrived';
        t.driver_arrived_at = ahora();
        return ok({ message: 'Llegada registrada. El cliente ha sido notificado.', trip: { id: t.id, status: t.status, driver_arrived_at: t.driver_arrived_at } });
      }
      if (t.status !== 'driver_arrived') return falla(400, 'Debe registrar la llegada antes de iniciar');
      t.status = 'in_progress';
      t.started_at = ahora();
      return ok({ message: 'Viaje iniciado exitosamente', trip: { id: t.id, status: t.status, started_at: t.started_at } });
    },
  },
  {
    metodo: 'POST', patron: /^driver\/trips\/(\d+)\/complete$/, rol: 'driver', fn: ({ db, params, body }) => {
      const t = db.trips.find((x) => x.id === Number(params[0]));
      if (!t) return falla(404, 'Viaje no encontrado');
      if (t.status !== 'in_progress') return falla(400, 'El viaje no está en curso');
      t.status = 'completed';
      const r = db.requests.find((x) => x.id === t.request_id);
      const base = calcularTarifa(db.fares.find((f) => f.active)!, body.actual_distance_km, body.actual_duration_min);
      t.final_fare = Math.round((base * factorServicio(r?.service_type)) / 100) * 100;
      t.completed_at = ahora();
      if (r) r.status = 'completed';
      const d = db.drivers.find((x) => x.id === t.driver_id);
      if (d) d.availability_status = 'available';
      return ok({
        message: 'Viaje finalizado con éxito. Tarifa definitiva calculada.',
        trip: {
          id: t.id, status: t.status, final_fare: t.final_fare, distance_travelled_km: body.actual_distance_km,
          duration_travelled_min: body.actual_duration_min, completed_at: t.completed_at,
        },
      });
    },
  },
  {
    metodo: 'POST', patron: /^driver\/location$/, rol: 'driver', fn: ({ db, user, body }) => {
      const d = conductorDe(db, user!)!;
      db.locations[d.id] = { latitude: body.latitude, longitude: body.longitude };
      return ok({ location: { driver_id: d.id, latitude: body.latitude, longitude: body.longitude, recorded_at: ahora() } });
    },
  },

  // ----- Administrador -----
  {
    metodo: 'GET', patron: /^admin\/dashboard$/, rol: 'admin', fn: ({ db }) => ok({
      stats: {
        total_clients: db.users.filter((u) => u.role === 'client').length,
        total_drivers: db.drivers.length,
        pending_drivers: db.drivers.filter((d) => d.approval_status === 'pending').length,
        approved_drivers: db.drivers.filter((d) => d.approval_status === 'approved').length,
        active_trips: db.trips.filter((t) => ['assigned', 'driver_arrived', 'in_progress'].includes(t.status)).length,
        completed_trips: db.trips.filter((t) => t.status === 'completed').length,
        cancelled_trips: db.trips.filter((t) => t.status === 'cancelled').length + db.requests.filter((r) => r.status === 'cancelled').length,
        pending_requests: db.requests.filter((r) => r.status === 'requested').length,
        total_revenue: db.trips.reduce((s, t) => s + (t.status === 'completed' ? (t.final_fare ?? 0) : 0), 0),
      },
      recent_trips: db.trips.slice(-5).reverse().map((t) => viajeConDetalle(db, t)),
      recent_incidents: db.trips.filter((t) => t.has_incident).reverse().slice(0, 10).map((t) => ({
        id: t.id, trip_id: t.id, description: t.comment || 'Problema reportado por el pasajero', score: t.score,
        created_at: t.completed_at ?? t.created_at, client: db.users.find((u) => u.id === t.client_id)?.name,
        driver: db.users.find((u) => u.id === db.drivers.find((x) => x.id === t.driver_id)?.user_id)?.name,
      })),
    }),
  },
  {
    metodo: 'GET', patron: /^admin\/drivers$/, rol: 'admin', fn: ({ db, req }) => {
      const filtro = req.params.get('approval_status');
      return ok({
        drivers: db.drivers.filter((d) => !filtro || d.approval_status === filtro).map((d) => {
          const u = db.users.find((x) => x.id === d.user_id)!;
          return { ...d, user: { name: u.name, email: u.email, phone: u.phone } };
        }),
      });
    },
  },
  {
    metodo: 'PATCH', patron: /^admin\/drivers\/(\d+)\/approval$/, rol: 'admin', fn: ({ db, params, body }) => {
      const d = db.drivers.find((x) => x.id === Number(params[0]));
      if (!d) return falla(404, 'Conductor no encontrado');
      d.approval_status = body.approval_status;
      if (body.approval_status !== 'approved') d.availability_status = 'unavailable';
      const nombre = db.users.find((u) => u.id === d.user_id)?.name;
      db.audit.push({
        id: sigId(db.audit), action: 'driver.approval', user: 'Administrador', created_at: ahora(),
        description: `${nombre}: ${d.approval_status}${body.admin_notes ? ` (${body.admin_notes})` : ''}`,
      });
      return ok({ message: `Estado del conductor actualizado a: ${d.approval_status}`, driver: { id: d.id, approval_status: d.approval_status } });
    },
  },
  {
    metodo: 'GET', patron: /^admin\/trips$/, rol: 'admin', fn: ({ db, req }) => {
      const estado = req.params.get('status');
      return ok({ trips: { data: db.trips.filter((t) => !estado || t.status === estado).reverse().map((t) => viajeConDetalle(db, t)) } });
    },
  },
  { metodo: 'GET', patron: /^admin\/fares$/, rol: 'admin', fn: ({ db }) => ok({ fares: db.fares }) },
  {
    metodo: 'POST', patron: /^admin\/fares$/, rol: 'admin', fn: ({ db, body }) => {
      if (body.active) db.fares.forEach((f) => (f.active = false));
      const f: MockFare = { id: sigId(db.fares), ...body };
      db.fares.push(f);
      db.audit.push({ id: sigId(db.audit), action: 'fare.create', description: `Nueva tarifa: ${f.name}`, user: 'Administrador', created_at: ahora() });
      return ok({ message: 'Tarifa configurada exitosamente', fare: f }, 201);
    },
  },
  {
    metodo: 'GET', patron: /^admin\/reports$/, rol: 'admin', fn: ({ db }) => {
      const completados = db.trips.filter((t) => t.status === 'completed');
      const cancelados = db.trips.filter((t) => t.status === 'cancelled');
      return ok({
        report: {
          total_trips: db.trips.length,
          completed_trips: completados.length,
          cancelled_trips: cancelados.length,
          cancellation_rate: db.trips.length ? Math.round((cancelados.length / db.trips.length) * 1000) / 10 : 0,
          total_revenue: completados.reduce((s, t) => s + (t.final_fare ?? 0), 0),
          average_fare: completados.length ? Math.round(completados.reduce((s, t) => s + (t.final_fare ?? 0), 0) / completados.length) : 0,
        },
      });
    },
  },
  { metodo: 'GET', patron: /^admin\/audit-logs$/, rol: 'admin', fn: ({ db }) => ok({ logs: [...db.audit].reverse() }) },
];

export const mockBackendInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.useMock || !req.url.startsWith(environment.apiUrl)) return next(req);

  const ruta = req.url.slice(environment.apiUrl.length + 1).split('?')[0];
  for (const r of RUTAS) {
    const m = r.metodo === req.method ? ruta.match(r.patron) : null;
    if (!m) continue;

    const db = leerDb();
    let user: MockUser | undefined;
    if (r.rol) {
      const token = req.headers.get('Authorization')?.replace('Bearer mock-token-', '');
      user = db.users.find((u) => u.id === Number(token));
      if (!user) return falla(401, 'Token inválido o expirado');
      if (r.rol !== 'auth' && user.role !== r.rol) return falla(403, 'No tiene permisos para acceder a este recurso');
    }

    const respuesta = r.fn({ req, body: req.body ?? {}, db, user, params: m.slice(1) });
    guardarDb(db);
    return respuesta;
  }
  return falla(404, `Ruta no encontrada en el simulador: ${req.method} /${ruta}`);
};

/** Multiplicador de precio por tipo de servicio de AUREN */
function factorServicio(servicio: string | undefined): number {
  return ({ moto: 0.7, eco: 1, confort: 1.35, plus: 1.7, van: 2.1 } as Record<string, number>)[servicio ?? ''] ?? 1;
}

/*
 * Movimiento simulado del conductor (solo en el simulador): para que el pasajero vea el carro avanzar
 * en el mapa sin que nadie maneje de verdad. Con el backend real, la posición es el GPS del conductor.
 */
const SIM_HACIA_RECOGIDA_MS = 90_000; // tarda 1,5 min en llegar a la recogida
const SIM_VIAJE_MAX_MS = 180_000; // y como máximo 3 min en llevar al pasajero

/** Si el conductor está lejos (o sin GPS), sale de un punto a ~1,5 km de la recogida */
function inicioSimulado(loc: { latitude: number; longitude: number } | undefined, r: MockRequest) {
  if (loc && haversine(loc.latitude, loc.longitude, r.origin_latitude, r.origin_longitude) < 4) return loc;
  return { latitude: r.origin_latitude - 0.009, longitude: r.origin_longitude - 0.01 };
}

function posicionSimulada(db: MockDb, t: MockTrip, r: MockRequest | undefined, driverId: number) {
  const guardada = db.locations[driverId];
  if (!r) return guardada;
  const recogida = { latitude: r.origin_latitude, longitude: r.origin_longitude };
  const destino = { latitude: r.destination_latitude, longitude: r.destination_longitude };
  const entre = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }, f: number) => ({
    latitude: a.latitude + (b.latitude - a.latitude) * f,
    longitude: a.longitude + (b.longitude - a.longitude) * f,
  });
  const transcurrido = (desde?: string) => (desde ? Date.now() - new Date(desde).getTime() : 0);

  switch (t.status) {
    case 'assigned': // hacia el pasajero; se detiene justo antes hasta que el conductor marque "Llegué"
      return entre(t.sim_inicio ?? inicioSimulado(guardada, r), recogida, Math.min(0.95, transcurrido(t.created_at) / SIM_HACIA_RECOGIDA_MS));
    case 'driver_arrived':
      return recogida;
    case 'in_progress': {
      const duracion = Math.min(SIM_VIAJE_MAX_MS, Math.max(60_000, r.estimated_duration_min * 60_000));
      return entre(recogida, destino, Math.min(0.97, transcurrido(t.started_at) / duracion));
    }
    case 'completed':
      return destino;
    default:
      return guardada ?? recogida;
  }
}
