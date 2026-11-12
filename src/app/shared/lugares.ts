import { Lugar } from '../core/models/models';

/**
 * Lugares conocidos de Neiva con coordenadas aproximadas, para escoger origen y destino
 * sin necesidad de un mapa. La API necesita latitud y longitud para calcular la distancia.
 */
export const LUGARES: Lugar[] = [
  { nombre: 'Parque Santander', lat: 2.9273, lng: -75.2894 },
  { nombre: 'Malecón del río Magdalena', lat: 2.9296, lng: -75.2953 },
  { nombre: 'Centro Comercial San Pedro Plaza', lat: 2.9401, lng: -75.2861 },
  { nombre: 'Centro Comercial Unicentro Neiva', lat: 2.9486, lng: -75.2896 },
  { nombre: 'Universidad Surcolombiana', lat: 2.9414, lng: -75.2932 },
  { nombre: 'Terminal de Transportes', lat: 2.9367, lng: -75.2804 },
  { nombre: 'Aeropuerto Benito Salas', lat: 2.9502, lng: -75.2940 },
  { nombre: 'Estadio Guillermo Plazas Alcid', lat: 2.9353, lng: -75.2784 },
  { nombre: 'Hospital Universitario', lat: 2.9338, lng: -75.2822 },
];
