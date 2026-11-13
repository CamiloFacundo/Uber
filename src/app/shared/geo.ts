import { Punto } from './mapa/mapa.component';

/** Distancia en km entre dos puntos (fórmula de Haversine). */
export function distanciaKm(a: Punto, b: Punto): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Minutos aproximados para recorrer esa distancia en ciudad (25 km/h promedio). */
export function minutosEnCiudad(km: number): number {
  return Math.max(1, Math.round((km / 25) * 60));
}
