/**
 * MOD-06 — Fechas civiles (T-B-02). Implementa ANEXO_C §3.3 sin `Date` (M-6):
 * toda aritmética va por número de día juliano, así que no existen zonas
 * horarias ni horario de verano que muevan una fecha de corte (plan 2.3 §5).
 */
import { type FechaIso, comoFechaIso, diasDelMes } from '../tipos/basicos';
import { casoImposible } from '../tipos/exhaustivo';
import type { MetodoConteoMeses } from '../enums/parametros';
import { Decimal } from './dinero';

export interface FechaCivil {
  readonly anio: number;
  readonly mes: number;
  readonly dia: number;
}

/** Divisor de ANEXO_C §2.1 y §3.3; también fija `fecha_fin_vida_util` (CT-13). */
export const DIAS_POR_ANIO = new Decimal('365.25');

export function descomponer(fecha: FechaIso): FechaCivil {
  return {
    anio: Number(fecha.slice(0, 4)),
    mes: Number(fecha.slice(5, 7)),
    dia: Number(fecha.slice(8, 10)),
  };
}

export function componer(anio: number, mes: number, dia: number): FechaIso {
  const aa = String(anio).padStart(4, '0');
  const mm = String(mes).padStart(2, '0');
  const dd = String(dia).padStart(2, '0');
  return comoFechaIso(`${aa}-${mm}-${dd}`);
}

/** Número de día juliano (calendario gregoriano proléptico), algoritmo de Fliegel–Van Flandern. */
export function aDiaJuliano(fecha: FechaIso): number {
  const { anio, mes, dia } = descomponer(fecha);
  const a = Math.floor((14 - mes) / 12);
  const y = anio + 4800 - a;
  const m = mes + 12 * a - 3;
  return (
    dia +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

export function desdeDiaJuliano(jdn: number): FechaIso {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const dia = e - Math.floor((153 * m + 2) / 5) + 1;
  const mes = m + 3 - 12 * Math.floor(m / 10);
  const anio = 100 * b + d - 4800 + Math.floor(m / 10);
  return componer(anio, mes, dia);
}

/** `fin − inicio` en días. Negativo si `fin` es anterior. */
export function diferenciaEnDias(inicio: FechaIso, fin: FechaIso): number {
  return aDiaJuliano(fin) - aDiaJuliano(inicio);
}

export function sumarDias(fecha: FechaIso, dias: number): FechaIso {
  if (!Number.isInteger(dias)) throw new TypeError(`Los días deben ser enteros: ${dias}`);
  return desdeDiaJuliano(aDiaJuliano(fecha) + dias);
}

/** ANEXO_C §3.2: inicio de depreciación cuando `deprecia_mes_adquisicion = falso`. */
export function primerDiaMesSiguiente(fecha: FechaIso): FechaIso {
  const { anio, mes } = descomponer(fecha);
  return mes === 12 ? componer(anio + 1, 1, 1) : componer(anio, mes + 1, 1);
}

export function ultimoDiaDelMes(fecha: FechaIso): FechaIso {
  const { anio, mes } = descomponer(fecha);
  return componer(anio, mes, diasDelMes(anio, mes));
}

/** Las fechas ISO se ordenan lexicográficamente. */
export function compararFechas(a: FechaIso, b: FechaIso): -1 | 0 | 1 {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

/**
 * ANEXO_C §3.3 — los tres métodos de conteo de meses entre `inicio` y `corte`.
 * Devuelve siempre `Decimal` (entero en `mes_completo`) para no ramificar aguas
 * abajo. Negativo si el corte es anterior al inicio: el llamador decide
 * (ANEXO_C §3.4 lo trata como error de datos). Función total: nunca lanza.
 */
export function contarMeses(inicio: FechaIso, corte: FechaIso, metodo: MetodoConteoMeses): Decimal {
  switch (metodo) {
    case 'mes_completo': {
      const i = descomponer(inicio);
      const c = descomponer(corte);
      const meses = (c.anio - i.anio) * 12 + (c.mes - i.mes);
      return new Decimal(c.dia < i.dia ? meses - 1 : meses);
    }
    case 'dias_exactos':
    case 'fraccion_anual': {
      // C es matemáticamente equivalente a B; se conservan como claves distintas
      // porque el método aplicado se persiste y se imprime en los informes.
      const dias = diferenciaEnDias(inicio, corte);
      return new Decimal(dias).div(DIAS_POR_ANIO).mul(12);
    }
    default:
      return casoImposible(metodo);
  }
}
