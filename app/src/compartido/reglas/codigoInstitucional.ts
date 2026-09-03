/**
 * RN-01-02 — Composición del código institucional por segmentos.
 * Puro: lo usa el main para generar códigos y el renderer para previsualizar.
 * Ejemplo: prefijo HSV · sede 01 · tipo AGM · consecutivo 01 → HSV01AGM01.
 */
import type { SegmentoCodigo } from '../dtos/configuracion';
import { casoImposible } from '../tipos/exhaustivo';

export interface DatosCodigo {
  readonly codigoSede: string;
  readonly abreviatura: string;
  readonly consecutivo: number;
}

/** Convención genérica cuando la entidad no definió una (VAL-01-10). */
export const CONVENCION_GENERICA: readonly SegmentoCodigo[] = Object.freeze([
  { tipo: 'CODIGO_SEDE' },
  { tipo: 'SEPARADOR', valor: '-' },
  { tipo: 'ABREVIATURA_TIPO' },
  { tipo: 'SEPARADOR', valor: '-' },
  { tipo: 'CONSECUTIVO' },
]);
export const LONGITUD_CONSECUTIVO_GENERICA = 4;

export function componerCodigo(
  segmentos: readonly SegmentoCodigo[],
  longitudConsecutivo: number,
  datos: DatosCodigo,
): string {
  return segmentos
    .map((s) => {
      switch (s.tipo) {
        case 'PREFIJO_ENTIDAD':
          return s.valor;
        case 'CODIGO_SEDE':
          return datos.codigoSede;
        case 'ABREVIATURA_TIPO':
          return datos.abreviatura;
        case 'CONSECUTIVO':
          return String(datos.consecutivo).padStart(longitudConsecutivo, '0');
        case 'SEPARADOR':
          return s.valor;
        default:
          return casoImposible(s);
      }
    })
    .join('')
    .toUpperCase();
}

/** Una convención sin CONSECUTIVO no puede generar códigos únicos. */
export function validarSegmentos(segmentos: readonly SegmentoCodigo[]): string | null {
  if (!segmentos.some((s) => s.tipo === 'CONSECUTIVO')) return 'La convención debe incluir el segmento CONSECUTIVO.';
  if (segmentos.filter((s) => s.tipo === 'CONSECUTIVO').length > 1) return 'Solo puede haber un segmento CONSECUTIVO.';
  return null;
}
