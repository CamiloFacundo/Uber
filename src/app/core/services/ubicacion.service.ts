import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';

export interface Posicion {
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
}

/**
 * Lee la ubicación del dispositivo (en el navegador pide permiso la primera vez).
 *
 * En un computador sin GPS, Windows calcula la ubicación con el WiFi y puede tardar varios segundos,
 * por eso se intenta dos veces: primero con alta precisión y, si no responde, con precisión normal
 * aceptando una ubicación reciente guardada. Los errores se traducen a un mensaje con la acción a tomar.
 */
@Injectable({ providedIn: 'root' })
export class UbicacionService {
  async actual(): Promise<Posicion> {
    if (!window.isSecureContext) {
      throw new Error('El navegador solo da la ubicación en sitios seguros. Abre la app en http://localhost:8100 o con https.');
    }
    if (!('geolocation' in navigator)) {
      throw new Error('Este navegador no permite obtener la ubicación. Toca el mapa para elegir tu punto.');
    }

    try {
      return await this.pedir({ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
    } catch (e) {
      const err = e as GeolocationPositionError;
      // Sin permiso no tiene sentido reintentar
      if (err.code === err.PERMISSION_DENIED) throw new Error(this.mensaje(err));
      try {
        return await this.pedir({ enableHighAccuracy: false, timeout: 20000, maximumAge: 5 * 60 * 1000 });
      } catch (e2) {
        throw new Error(this.mensaje(e2 as GeolocationPositionError));
      }
    }
  }

  private pedir(opciones: PositionOptions): Promise<Posicion> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          heading: p.coords.heading,
          speed: p.coords.speed,
        }),
        reject,
        opciones,
      );
    });
  }

  private mensaje(err: GeolocationPositionError): string {
    switch (err?.code) {
      case 1: // PERMISSION_DENIED
        if (Capacitor.isNativePlatform()) {
          return 'No diste permiso de ubicación. Actívalo en Ajustes > Aplicaciones > AUREN > Permisos, o toca el mapa para elegir tu punto.';
        }
        return 'No diste permiso de ubicación. Actívalo en el ícono a la izquierda de la dirección del navegador, o toca el mapa para elegir tu punto.';
      case 2: // POSITION_UNAVAILABLE
        return Capacitor.isNativePlatform()
          ? 'El celular no pudo calcular la ubicación. Activa el GPS (Ubicación) en el panel rápido, o toca el mapa.'
          : 'Tu equipo no pudo calcular la ubicación. Revisa que el WiFi esté encendido y que la ubicación de Windows esté activada, o toca el mapa.';
      case 3: // TIMEOUT
        return 'La ubicación tardó demasiado. Intenta de nuevo o toca el mapa para elegir tu punto.';
      default:
        return 'No se pudo obtener tu ubicación. Toca el mapa para elegir tu punto.';
    }
  }
}
