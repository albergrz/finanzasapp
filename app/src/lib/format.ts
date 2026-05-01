export const fmt = (n: number) =>
  n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

export const pad = (n: number) => String(n).padStart(2, '0');

export const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export type Period = 'today' | 'week' | 'month' | 'all';

export function periodRange(period: Period, now = new Date()): { from: Date | null; to: Date | null } {
  if (period === 'all') return { from: null, to: null };
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (period === 'today') {
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { from: start, to: end };
  }
  if (period === 'week') {
    const dow = start.getDay();
    start.setDate(start.getDate() - (dow === 0 ? 6 : dow - 1));
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { from: start, to: end };
  }
  // month
  start.setDate(1);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { from: start, to: end };
}
