/**
 * Tipos de vehículo de AUREN. El factor multiplica la tarifa estimada que calcula el servidor.
 * Se envían al backend como "service_type"; si el backend del profesor aún no lo usa,
 * el precio final lo decide el servidor.
 */
export type TipoServicio = 'moto' | 'eco' | 'confort' | 'plus' | 'van';

/** Tipo de vehículo del conductor: una moto solo atiende viajes AUREN Moto y un carro atiende los demás. */
export type TipoVehiculo = 'car' | 'moto';

export interface Categoria {
  id: TipoServicio;
  nombre: string;
  detalle: string;
  icono: string;
  /** Ícono propio (ruta a un SVG) cuando Ionicons no tiene uno adecuado */
  src?: string;
  asientos: number;
  factor: number;
}

export const CATEGORIAS: Categoria[] = [
  { id: 'moto', nombre: 'Auren Moto', detalle: 'Rápido y económico, 1 pasajero', icono: 'bicycle-outline', src: 'assets/icon/moto.svg', asientos: 1, factor: 0.7 },
  { id: 'eco', nombre: 'Auren Eco', detalle: 'Viaje económico', icono: 'car-outline', asientos: 4, factor: 1 },
  { id: 'confort', nombre: 'Auren Confort', detalle: 'Más espacio y comodidad', icono: 'car-sport-outline', asientos: 4, factor: 1.35 },
  { id: 'plus', nombre: 'Auren Plus', detalle: 'Viaje premium', icono: 'diamond-outline', asientos: 4, factor: 1.7 },
  { id: 'van', nombre: 'Auren Van', detalle: 'Grupos y familias', icono: 'bus-outline', asientos: 7, factor: 2.1 },
];

/** Precio por tipo de vehículo, redondeado a centenas como en Colombia. */
export function precioCategoria(tarifaBase: number, c: Categoria): number {
  return Math.round((tarifaBase * c.factor) / 100) * 100;
}

/** Qué tipo de vehículo puede atender un servicio. */
export function vehiculoParaServicio(servicio: string | undefined): TipoVehiculo {
  return servicio === 'moto' ? 'moto' : 'car';
}

export function nombreServicio(servicio: string | undefined): string {
  return CATEGORIAS.find((c) => c.id === servicio)?.nombre ?? 'Auren Eco';
}
