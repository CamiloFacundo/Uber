import { Injectable } from '@angular/core';
import { Lugar } from '../models/models';

/**
 * Busca direcciones reales con Nominatim (OpenStreetMap, gratuito y sin clave),
 * limitado a Neiva y alrededores. Si no hay internet devuelve una lista vacía y
 * el pasajero puede elegir de los lugares conocidos o tocar el mapa.
 */
@Injectable({ providedIn: 'root' })
export class BusquedaService {
  // Rectángulo aproximado de Neiva y alrededores (oeste, norte, este, sur)
  private readonly zona = '-75.40,3.05,-75.18,2.82';

  async buscar(texto: string): Promise<Lugar[]> {
    const q = texto.trim();
    if (q.length < 3) return [];
    const url =
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=co&accept-language=es` +
      `&bounded=1&viewbox=${this.zona}&q=${encodeURIComponent(q)}`;
    try {
      const control = new AbortController();
      setTimeout(() => control.abort(), 6000);
      const r = await fetch(url, { signal: control.signal });
      const datos = (await r.json()) as { display_name: string; lat: string; lon: string }[];
      return datos.map((d) => ({
        // "Calle 8, Centro, Neiva, Huila, Colombia" → "Calle 8, Centro"
        nombre: d.display_name.split(',').slice(0, 2).join(',').trim(),
        lat: Number(d.lat),
        lng: Number(d.lon),
      }));
    } catch {
      return [];
    }
  }
}
