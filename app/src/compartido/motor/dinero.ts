/**
 * MOD-06 — Dinero (T-B-02). Implementa ANEXO_C §8 (RED-01 … RED-06) y ADR-006.
 *
 * - En la base y en los DTO el dinero es `Centavos` (entero).
 * - Dentro del motor todo cálculo es `Decimal` a precisión completa (RED-01).
 * - Se redondea UNA sola vez, en la frontera, con `aCentavos` (RED-02, RED-04).
 * - Los totales suman centavos ya redondeados, nunca recalculan (RED-05).
 */
import DecimalBase from 'decimal.js';
import { type Centavos, type X10k, comoCentavos, comoX10k } from '../tipos/basicos';

/**
 * Clon aislado de decimal.js: su configuración no afecta a ningún otro consumidor.
 *
 * RED-06 "al más cercano, con desempate hacia arriba" se implementa como
 * `ROUND_HALF_UP` (desempate alejándose de cero), siguiendo plan 2.6 §7. Para
 * importes positivos —la totalidad de costos, bases y saldos— es idéntico a
 * "hacia arriba"; solo difiere en negativos exactos a mitad de centavo.
 */
export const Decimal = DecimalBase.clone({
  precision: 40,
  rounding: DecimalBase.ROUND_HALF_UP,
  toExpNeg: -20,
  toExpPos: 40,
});
export type Decimal = DecimalBase;

export type ValorDecimal = Decimal | number | string;

export function decimal(valor: ValorDecimal): Decimal {
  return new Decimal(valor);
}

/** RED-06: redondeo al más cercano con desempate hacia arriba, a `decimales` cifras. */
export function redondear(valor: ValorDecimal, decimales: number): Decimal {
  return new Decimal(valor).toDecimalPlaces(decimales, DecimalBase.ROUND_HALF_UP);
}

/** Centavos → pesos con decimales, para operar dentro del motor. */
export function pesos(centavos: Centavos): Decimal {
  return new Decimal(centavos).div(100);
}

/** RED-02 + RED-04 + RED-06: la ÚNICA puerta de pesos decimales a `Centavos`. */
export function aCentavos(valorEnPesos: ValorDecimal): Centavos {
  const d = new Decimal(valorEnPesos);
  if (!d.isFinite()) throw new TypeError(`Importe no finito: ${String(valorEnPesos)}`);
  return comoCentavos(d.mul(100).toDecimalPlaces(0, DecimalBase.ROUND_HALF_UP).toNumber());
}

/** RED-03: índices y factores se persisten con 4 decimales exactos (entero ×10.000). */
export function aX10k(valor: ValorDecimal): X10k {
  const d = new Decimal(valor);
  if (!d.isFinite()) throw new TypeError(`Factor no finito: ${String(valor)}`);
  return comoX10k(d.mul(10_000).toDecimalPlaces(0, DecimalBase.ROUND_HALF_UP).toNumber());
}

export function desdeX10k(valor: X10k): Decimal {
  return new Decimal(valor).div(10_000);
}

/**
 * RED-05: un total es la suma de los detalles YA redondeados. La suma de enteros
 * es exacta; solo se comprueba que no desborde el rango seguro.
 */
export function sumarCentavos(...valores: readonly Centavos[]): Centavos {
  let total = 0;
  for (const v of valores) total += v;
  return comoCentavos(total);
}

export function restarCentavos(minuendo: Centavos, sustraendo: Centavos): Centavos {
  return comoCentavos(minuendo - sustraendo);
}

export function negarCentavos(valor: Centavos): Centavos {
  return comoCentavos(-valor);
}

export function compararCentavos(a: Centavos, b: Centavos): -1 | 0 | 1 {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

/**
 * Convierte un texto numérico canónico (`"23739280"`, `"1234.5"`, `"-0.5"`) a
 * centavos. Devuelve `null` si no es un número. Los formatos con separadores
 * es-CO (`23.739.280,00`) los normaliza el importador antes de llegar aquí.
 */
export function centavosDesdeTexto(texto: string): Centavos | null {
  const limpio = texto.trim();
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(limpio)) return null;
  return aCentavos(limpio);
}
