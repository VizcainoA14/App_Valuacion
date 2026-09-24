/**
 * TR-01 — Catálogo declarativo de la revisión de la configuración (metadatos).
 * Los predicados viven en el main junto al módulo (necesitan la base); aquí está
 * lo que comparten main y renderer: código, severidad y texto de
 * `/especificacion/teoria` §8 del paso 01, literal.
 *
 * ADR-028: hasta entonces había 58 validaciones repartidas por los 11 pasos y
 * servían para dejar avanzar —o no— de un paso al siguiente. Sin pasos que
 * encadenar, se conservan solo las que dicen si la entidad está lista para que
 * el cálculo tenga sentido. Las que exigían un documento externo (VAL-01-08,
 * manual de políticas) o un ejercicio (VAL-01-06, fecha de corte; VAL-01-07,
 * método confirmado por acta) se retiraron. La calidad del inventario la
 * vigilan el importador, fila por fila, y el cálculo, que dice qué dejó fuera
 * y por qué.
 */
import type { SeveridadValidacion } from '../dtos/configuracion';

export interface DefinicionValidacion {
  readonly codigo: string;
  readonly severidad: SeveridadValidacion;
  /** Texto literal de /especificacion/teoria §8 del paso 01. */
  readonly mensaje: string;
}

const def = (n: number, severidad: SeveridadValidacion, mensaje: string): DefinicionValidacion => ({
  codigo: `VAL-01-${String(n).padStart(2, '0')}`,
  severidad,
  mensaje,
});

const B = 'BLOQUEANTE';
const A = 'ADVERTENCIA';

export const VALIDACIONES: readonly DefinicionValidacion[] = Object.freeze([
  def(1, B, 'La entidad tiene razón social y NIT'),
  def(2, B, 'Existe al menos una sede activa'),
  def(3, B, 'Existe al menos un servicio activo'),
  def(4, B, 'Toda clase activa tiene vida útil contable > 0 (salvo terrenos)'),
  def(5, B, 'Toda clase activa está mapeada a una subcuenta contable'),
  def(9, A, 'Alguna clase tiene vida útil técnica distinta de la contable (verificar intencionalidad)'),
  def(10, A, 'No se definió convención de codificación (se usará la genérica)'),
]);
