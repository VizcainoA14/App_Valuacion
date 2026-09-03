/**
 * TR-02 · fase 2 NORMALIZAR (ANEXO_C §9, ANEXO_A §3.2–3.4). Regla de oro: nunca
 * adivinar; lo no interpretable se rechaza con motivo y toda interpretación
 * (una fecha DD/MM, una coma decimal) se reporta.
 */
import { esFechaIso, type FechaIso } from '../../../../compartido/tipos/basicos';
import { componer } from '../../../../compartido/motor/fechas';

export type TipoColumna = 'texto' | 'entero' | 'numero' | 'moneda' | 'fecha' | 'si_no' | 'lista';
export type FormatoFechaRegional = 'DD/MM/AAAA' | 'MM/DD/AAAA';

export interface OpcionesNormalizacion {
  readonly formatoFecha: FormatoFechaRegional;
  /** Valores canónicos permitidos para `lista`. */
  readonly catalogo?: readonly string[];
  readonly noNegativo?: boolean;
}

export type ValorNormalizado = string | number | boolean | null;

export type ResultadoNormalizacion =
  | { readonly ok: true; readonly valor: ValorNormalizado; readonly nota?: { readonly regla: string; readonly interpretado: string } }
  | { readonly ok: false; readonly motivo: string };

/** ANEXO_A §3.4: valores que significan "dato no disponible" → nulo, no cero. */
const NULOS = new Set(['', '-', 'N/A', 'NA', 'NT', 'NO REGISTRA', 'NO APLICA', 'S/D', 'SIN DATO', 'NULL']);

export function esNulo(valor: unknown): boolean {
  if (valor === null || valor === undefined) return true;
  if (typeof valor === 'string') return NULOS.has(valor.trim().toUpperCase().replace(/\s+/g, ' '));
  return false;
}

function texto(valor: unknown): string {
  return String(valor).trim().replace(/\s+/g, ' ');
}

const SI = new Set(['SI', 'SÍ', 'S', 'TRUE', 'VERDADERO', '1', 'X']);
const NO = new Set(['NO', 'N', 'FALSE', 'FALSO', '0']);

export function normalizar(valor: unknown, tipo: TipoColumna, opciones: OpcionesNormalizacion): ResultadoNormalizacion {
  if (esNulo(valor)) return { ok: true, valor: null };

  switch (tipo) {
    case 'texto':
      return { ok: true, valor: texto(valor) };

    case 'si_no': {
      if (typeof valor === 'boolean') return { ok: true, valor };
      const v = texto(valor).toUpperCase();
      if (SI.has(v)) return { ok: true, valor: true };
      if (NO.has(v)) return { ok: true, valor: false };
      return { ok: false, motivo: `Se esperaba SI o NO, llegó "${texto(valor)}"` };
    }

    case 'lista': {
      const v = texto(valor).toUpperCase();
      const catalogo = opciones.catalogo ?? [];
      const canonico = catalogo.find((c) => c.toUpperCase() === v);
      if (canonico === undefined) {
        return { ok: false, motivo: `"${texto(valor)}" no está en el catálogo (${catalogo.join(', ')})` };
      }
      return canonico === texto(valor)
        ? { ok: true, valor: canonico }
        : { ok: true, valor: canonico, nota: { regla: 'lista: mayúsculas unificadas', interpretado: canonico } };
    }

    case 'entero': {
      const n = numeroDesde(valor);
      if (n === null || !Number.isInteger(n)) return { ok: false, motivo: `Se esperaba un entero, llegó "${texto(valor)}"` };
      if (opciones.noNegativo === true && n < 0) return { ok: false, motivo: 'No se admiten valores negativos' };
      return { ok: true, valor: n };
    }

    case 'numero': {
      const n = numeroDesde(valor);
      if (n === null) return { ok: false, motivo: `Se esperaba un número, llegó "${texto(valor)}"` };
      if (opciones.noNegativo === true && n < 0) return { ok: false, motivo: 'No se admiten valores negativos' };
      const nota = typeof valor === 'string' && valor.includes(',') ? { regla: 'número: coma decimal', interpretado: String(n) } : undefined;
      return nota === undefined ? { ok: true, valor: n } : { ok: true, valor: n, nota };
    }

    case 'moneda':
      return normalizarMoneda(valor, opciones);

    case 'fecha':
      return normalizarFecha(valor, opciones.formatoFecha);
  }
}

function numeroDesde(valor: unknown): number | null {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  if (typeof valor !== 'string') return null;
  const limpio = valor.trim();
  if (!/^[+-]?\d+([.,]\d+)?$/.test(limpio)) return null;
  return Number(limpio.replace(',', '.'));
}

/**
 * ANEXO_C §9.2: sin símbolo, sin espacios ni separadores de miles. Si aparecen
 * punto y coma, el ÚLTIMO es el decimal; si solo hay uno y va seguido de exactamente
 * tres dígitos repetido, es de miles. Devuelve pesos como texto decimal canónico.
 */
export function normalizarMoneda(valor: unknown, opciones: OpcionesNormalizacion): ResultadoNormalizacion {
  if (typeof valor === 'number') {
    if (!Number.isFinite(valor)) return { ok: false, motivo: 'Importe no numérico' };
    if (opciones.noNegativo === true && valor < 0) return { ok: false, motivo: 'No se admiten importes negativos en costos' };
    return { ok: true, valor: String(valor) };
  }
  const original = texto(valor);
  let limpio = original.replace(/[$\s]|COP/gi, '');
  const tienePunto = limpio.includes('.');
  const tieneComa = limpio.includes(',');
  let regla: string | null = null;

  if (tienePunto && tieneComa) {
    const decimal = limpio.lastIndexOf('.') > limpio.lastIndexOf(',') ? '.' : ',';
    const miles = decimal === '.' ? ',' : '.';
    limpio = limpio.split(miles).join('').replace(decimal, '.');
    regla = `moneda: separador decimal "${decimal}", miles "${miles}"`;
  } else if (tieneComa) {
    const partes = limpio.split(',');
    if (partes.length > 2 || (partes.length === 2 && partes[1]?.length === 3)) {
      limpio = partes.join('');
      regla = 'moneda: coma como separador de miles';
    } else {
      limpio = limpio.replace(',', '.');
      regla = 'moneda: coma decimal';
    }
  } else if (tienePunto) {
    const partes = limpio.split('.');
    if (partes.length > 2 || (partes.length === 2 && partes[1]?.length === 3)) {
      limpio = partes.join('');
      regla = 'moneda: punto como separador de miles';
    }
  }

  if (!/^[+-]?\d+(\.\d+)?$/.test(limpio)) return { ok: false, motivo: `Importe no interpretable: "${original}"` };
  if (opciones.noNegativo === true && limpio.startsWith('-')) return { ok: false, motivo: 'No se admiten importes negativos en costos' };
  return regla === null ? { ok: true, valor: limpio } : { ok: true, valor: limpio, nota: { regla, interpretado: limpio } };
}

const EPOCA_EXCEL_JDN_OFFSET = 25569; // días entre 1899-12-30 y 1970-01-01

/** ANEXO_C §9.1: ISO primero; luego DD/MM o MM/DD según formato regional, reportando la interpretación. */
export function normalizarFecha(valor: unknown, formato: FormatoFechaRegional): ResultadoNormalizacion {
  if (valor instanceof Date) {
    const iso = componer(valor.getUTCFullYear(), valor.getUTCMonth() + 1, valor.getUTCDate());
    return { ok: true, valor: iso, nota: { regla: 'fecha: celda de tipo fecha de Excel', interpretado: iso } };
  }
  if (typeof valor === 'number') {
    if (!Number.isInteger(valor) || valor < 1) return { ok: false, motivo: `Número serial de fecha inválido: ${valor}` };
    const ms = (valor - EPOCA_EXCEL_JDN_OFFSET) * 86_400_000;
    const d = new Date(ms);
    const iso = componer(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    return { ok: true, valor: iso, nota: { regla: 'fecha: número serial de Excel', interpretado: iso } };
  }
  const t = texto(valor);
  if (esFechaIso(t)) return { ok: true, valor: t };

  let m = /^(\d{4})[/.](\d{1,2})[/.](\d{1,2})$/.exec(t);
  if (m !== null) return construir(m[1], m[2], m[3], t, 'fecha: AAAA/MM/DD');

  m = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(t);
  if (m !== null) {
    const [a, b] = formato === 'DD/MM/AAAA' ? [m[2], m[1]] : [m[1], m[2]];
    return construir(m[3], a, b, t, `fecha: ${formato} (formato regional configurado)`);
  }
  return { ok: false, motivo: `Fecha no reconocible: "${t}". Use AAAA-MM-DD` };
}

function construir(anio: string | undefined, mes: string | undefined, dia: string | undefined, original: string, regla: string): ResultadoNormalizacion {
  const candidato = `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  if (!esFechaIso(candidato)) return { ok: false, motivo: `Fecha inexistente en el calendario: "${original}"` };
  return { ok: true, valor: candidato as FechaIso, nota: { regla, interpretado: candidato } };
}
