/**
 * ÚNICO lugar donde se formatea dinero, fecha, índice y porcentaje (plan 2.5 §7,
 * RNF-12, RED-05). El renderer nunca opera con dinero: solo muestra lo que el
 * main ya calculó y redondeó.
 */
import type { Centavos, FechaIso, X10k } from '@compartido/tipos/basicos';

const LOCALE = 'es-CO';

const dinero = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'COP', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const indice = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const porcentaje = new Intl.NumberFormat(LOCALE, { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const entero = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 });

/** `2373928000` centavos → `$ 23.739.280,00`. */
export function formatearDinero(centavos: Centavos | number | null | undefined): string {
  if (centavos === null || centavos === undefined) return '—';
  return dinero.format(centavos / 100).replace(/ /g, ' ');
}

/** `2025-06-30` → `30/06/2025`. Sin `Date`: la fecha civil no tiene zona horaria. */
export function formatearFecha(iso: FechaIso | string | null | undefined): string {
  if (iso === null || iso === undefined || iso === '') return '—';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

/** Marca ISO 8601 UTC → fecha y hora locales `30/06/2025, 14:03`. */
export function formatearMarcaTiempo(iso: string | null | undefined): string {
  if (iso === null || iso === undefined || iso === '') return '—';
  return new Intl.DateTimeFormat(LOCALE, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}

/** `6899` (x10k) → `0,6899`. */
export function formatearIndice(x10k: X10k | number | null | undefined): string {
  if (x10k === null || x10k === undefined) return '—';
  return indice.format(x10k / 10_000);
}

/** `6899` (x10k) → `68,99 %`. */
export function formatearPorcentajeX10k(x10k: X10k | number | null | undefined): string {
  if (x10k === null || x10k === undefined) return '—';
  return porcentaje.format(x10k / 10_000).replace(/ /g, ' ');
}

export function formatearEntero(n: number | null | undefined): string {
  return n === null || n === undefined ? '—' : entero.format(n);
}

export function formatearDecimal(n: number | null | undefined): string {
  return n === null || n === undefined ? '—' : decimal.format(n);
}
