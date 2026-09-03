/**
 * MOD-00 — Tipos base nominales (T-B-01).
 *
 * Un `number` corriente no se puede asignar a `Centavos` sin pasar por su
 * constructor; una cadena cualquiera no es una `FechaIso`. La marca solo existe
 * en compilación: en ejecución son números y cadenas normales (ADR-006, plan 2.4 §2).
 *
 * Los constructores `como*` lanzan `TypeError`: una violación aquí es un error de
 * programación (un invariante roto), no un error de negocio. La validación de
 * datos de usuario se hace con los esquemas Zod de `esquemas/`.
 */

declare const marcaTipo: unique symbol;
type Nominal<T, Marca extends string> = T & { readonly [marcaTipo]: Marca };

/** UUID en minúsculas (v7 preferido: ordenable por tiempo). */
export type Uuid = Nominal<string, 'Uuid'>;

/** Fecha civil `AAAA-MM-DD`, sin zona horaria. Comparable lexicográficamente. */
export type FechaIso = Nominal<string, 'FechaIso'>;

/** Marca de tiempo ISO 8601 en UTC (`2026-09-02T14:03:00.000Z`). Solo para auditoría. */
export type MarcaTiempo = Nominal<string, 'MarcaTiempo'>;

/** Dinero: entero de centavos de peso colombiano. Nunca coma flotante (RG-02). */
export type Centavos = Nominal<number, 'Centavos'>;

/** Índices y factores: entero escalado ×10.000 (4 decimales exactos, RED-03). */
export type X10k = Nominal<number, 'X10k'>;

// ── UUID ─────────────────────────────────────────────────────────────────────

const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function esUuid(valor: unknown): valor is Uuid {
  return typeof valor === 'string' && PATRON_UUID.test(valor);
}

export function comoUuid(valor: string): Uuid {
  const normalizado = valor.toLowerCase();
  if (!esUuid(normalizado)) throw new TypeError(`No es un UUID válido: "${valor}"`);
  return normalizado;
}

// ── Fecha civil ──────────────────────────────────────────────────────────────

const PATRON_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

export function esBisiesto(anio: number): boolean {
  return (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
}

export function diasDelMes(anio: number, mes: number): number {
  if (mes === 2) return esBisiesto(anio) ? 29 : 28;
  return [4, 6, 9, 11].includes(mes) ? 30 : 31;
}

/** Verdadero solo si tiene el formato y además existe en el calendario gregoriano. */
export function esFechaIso(valor: unknown): valor is FechaIso {
  if (typeof valor !== 'string') return false;
  const partes = PATRON_FECHA.exec(valor);
  if (partes === null) return false;
  const anio = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  if (anio < 1 || mes < 1 || mes > 12 || dia < 1) return false;
  return dia <= diasDelMes(anio, mes);
}

export function comoFechaIso(valor: string): FechaIso {
  if (!esFechaIso(valor)) throw new TypeError(`No es una fecha AAAA-MM-DD válida: "${valor}"`);
  return valor;
}

// ── Marca de tiempo ──────────────────────────────────────────────────────────

const PATRON_MARCA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

export function esMarcaTiempo(valor: unknown): valor is MarcaTiempo {
  return typeof valor === 'string' && PATRON_MARCA.test(valor);
}

export function comoMarcaTiempo(valor: string): MarcaTiempo {
  if (!esMarcaTiempo(valor)) throw new TypeError(`No es una marca ISO 8601 UTC: "${valor}"`);
  return valor;
}

// ── Centavos y X10k ──────────────────────────────────────────────────────────

export function esCentavos(valor: unknown): valor is Centavos {
  return typeof valor === 'number' && Number.isSafeInteger(valor);
}

/** Único constructor de `Centavos`. Exige un entero seguro (±2^53); normaliza el cero negativo. */
export function comoCentavos(valor: number): Centavos {
  if (!esCentavos(valor)) throw new TypeError(`Centavos debe ser un entero seguro: ${valor}`);
  return (valor === 0 ? 0 : valor) as Centavos;
}

export function esX10k(valor: unknown): valor is X10k {
  return typeof valor === 'number' && Number.isSafeInteger(valor);
}

export function comoX10k(valor: number): X10k {
  if (!esX10k(valor)) throw new TypeError(`X10k debe ser un entero seguro: ${valor}`);
  return (valor === 0 ? 0 : valor) as X10k;
}

export const CERO_CENTAVOS: Centavos = 0 as Centavos;
