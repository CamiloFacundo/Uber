/** 45 → "45 min"; 90 → "1 h 30 min"; 120 → "2 h" */
export function duracion(minutos: number): string {
  const m = Math.max(0, Math.round(minutos));
  const h = Math.floor(m / 60);
  const resto = m % 60;
  if (!h) return `${resto} min`;
  return resto ? `${h} h ${resto} min` : `${h} h`;
}
