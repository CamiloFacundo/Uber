/**
 * Tipos de viaje de AUREN. El factor multiplica la tarifa estimada que calcula el servidor.
 * Se envían al backend como "service_type"; si el backend del profesor aún no lo usa,
 * el precio final lo decide el servidor.
 */
export type TipoServicio = 'confort' | 'plus' | 'premium';

export interface Categoria {
  id: TipoServicio;
  nombre: string;
  detalle: string;
  icono: string;
  factor: number;
}

export const CATEGORIAS: Categoria[] = [
  { id: 'confort', nombre: 'AUREN Confort', detalle: 'Viaje cómodo y seguro', icono: 'car-outline', factor: 1 },
  { id: 'plus', nombre: 'AUREN Plus', detalle: 'Más espacio para ti', icono: 'car-sport-outline', factor: 1.4 },
  { id: 'premium', nombre: 'AUREN Premium', detalle: 'Máximo confort', icono: 'diamond-outline', factor: 1.9 },
];

/** Precio por tipo de viaje, redondeado a centenas como en Colombia. */
export function precioCategoria(tarifaBase: number, c: Categoria): number {
  return Math.round((tarifaBase * c.factor) / 100) * 100;
}
