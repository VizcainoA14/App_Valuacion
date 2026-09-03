/**
 * TR-01 — Catálogo declarativo de validaciones (metadatos). Los predicados viven
 * en el main junto a cada módulo (necesitan la base); aquí está lo que comparten
 * main y renderer: código, paso, severidad y texto de /Teoria, literal.
 * Añadir una validación es una entrada aquí + su predicado, no un `if` disperso.
 */
import type { SeveridadValidacion } from '../dtos/configuracion';

export interface DefinicionValidacion {
  readonly codigo: string;
  readonly paso: number;
  readonly severidad: SeveridadValidacion;
  /** Texto literal de /Teoria §8 del paso. */
  readonly mensaje: string;
}

const def = (paso: number, n: number, severidad: SeveridadValidacion, mensaje: string): DefinicionValidacion => ({
  codigo: `VAL-${String(paso).padStart(2, '0')}-${String(n).padStart(2, '0')}`,
  paso,
  severidad,
  mensaje,
});

const B = 'BLOQUEANTE';
const A = 'ADVERTENCIA';

/** Paso 01 §8 — bloqueantes impiden avanzar al paso 02 (RF-01-06). */
export const VALIDACIONES_PASO_01: readonly DefinicionValidacion[] = Object.freeze([
  def(1, 1, B, 'La entidad tiene razón social y NIT'),
  def(1, 2, B, 'Existe al menos una sede activa'),
  def(1, 3, B, 'Existe al menos un servicio activo'),
  def(1, 4, B, 'Toda clase activa tiene vida útil contable > 0 (salvo terrenos)'),
  def(1, 5, B, 'Toda clase activa está mapeada a una subcuenta contable'),
  def(1, 6, B, 'La fecha de corte está definida y no es futura'),
  def(1, 7, B, 'El método de conteo de meses está seleccionado'),
  def(1, 8, A, 'No se cargó el Manual de Políticas Contables como soporte'),
  def(1, 9, A, 'Alguna clase tiene vida útil técnica distinta de la contable (verificar intencionalidad)'),
  def(1, 10, A, 'No se definió convención de codificación (se usará la genérica)'),
]);

/** Paso 02 §8. */
export const VALIDACIONES_PASO_02: readonly DefinicionValidacion[] = Object.freeze([
  def(2, 1, B, 'No existen códigos institucionales duplicados'),
  def(2, 2, B, 'No existen placas duplicadas'),
  def(2, 3, B, 'Todo bien tiene clase, sede y servicio válidos del catálogo'),
  def(2, 4, B, 'Todo bien tiene estado actual y condición de tenencia'),
  def(2, 5, B, 'Todos los servicios activos fueron recorridos (cobertura 100%)'),
  def(2, 6, A, 'Bien en estado Malo/Inservible sin fotografía'),
  def(2, 7, A, 'Serie duplicada entre dos bienes'),
  def(2, 8, A, 'Servicio sin bienes registrados (¿realmente está vacío?)'),
  def(2, 9, A, 'Bien sin responsable de custodia asignado'),
]);

/** Paso 03 §8. */
export const VALIDACIONES_PASO_03: readonly DefinicionValidacion[] = Object.freeze([
  def(3, 1, B, 'Todo bien de clase con requiere_hoja_vida tiene hoja de vida creada'),
  def(3, 2, B, 'fecha_adquisicion es válida y no posterior a la fecha de corte'),
  def(3, 3, B, 'costo_adquisicion > 0 o existe justificación registrada'),
  def(3, 4, B, 'Bienes biomédicos con requiere_invima tienen registro o justificación de exención'),
  def(3, 5, A, 'Bien sin historial de mantenimiento en los últimos 24 meses'),
  def(3, 6, A, 'Costo de adquisición atípico frente a bienes de la misma descripción (posible error de digitación)'),
  def(3, 7, A, 'Fecha de adquisición anterior a la creación de la entidad'),
  def(3, 8, A, 'Bien sin soporte documental adjunto'),
]);

/** Paso 05 §8. */
export const VALIDACIONES_PASO_05: readonly DefinicionValidacion[] = Object.freeze([
  def(5, 1, B, 'Todo bien evaluable tiene fecha de adquisición válida'),
  def(5, 2, B, 'Toda clase evaluada tiene vida útil técnica > 0'),
  def(5, 3, B, 'No existen fechas de adquisición posteriores a la fecha de corte'),
  def(5, 4, B, 'Todo ajuste de vida útil (PL-08b) tiene justificación y soporte'),
  def(5, 5, B, 'Toda obsolescencia_funcional = Sí tiene justificación'),
  def(5, 6, A, 'Bien con índice ≥ 1 y estado "Bueno" (revisar coherencia)'),
  def(5, 7, A, 'Bien con índice < 0,3 marcado como inservible (revisar)'),
  def(5, 8, A, 'Más del 40% de una clase en semáforo rojo (riesgo de habilitación)'),
  def(5, 9, A, 'Bienes candidatos a baja sin concepto del especialista'),
]);

/** Paso 06 §8. */
export const VALIDACIONES_PASO_06: readonly DefinicionValidacion[] = Object.freeze([
  def(6, 1, B, 'Existe acta de definición del método de depreciación'),
  def(6, 2, B, 'Todo bien calculado tiene costo > 0 y fecha de adquisición válida'),
  def(6, 3, B, 'Ninguna depreciación acumulada supera su base depreciable'),
  def(6, 4, B, 'Ningún saldo por depreciar es negativo'),
  def(6, 5, B, 'Todo deterioro reconocido tiene indicio, justificación y soporte'),
  def(6, 6, B, 'Los totales por subcuenta cuadran con la suma del detalle'),
  def(6, 7, A, 'Diferencia superior al 15% entre depreciación recalculada y de libros'),
  def(6, 8, A, 'Bien totalmente depreciado pero en estado "Bueno" y operativo'),
  def(6, 9, A, 'Más del 5% de bienes excluidos por datos incompletos'),
  def(6, 10, A, 'Deterioro reconocido superior al 50% del valor neto'),
]);

/** Paso 09 §8. */
export const VALIDACIONES_PASO_09: readonly DefinicionValidacion[] = Object.freeze([
  def(9, 1, B, 'Toda propuesta de baja tiene causal asignada'),
  def(9, 2, B, 'Toda propuesta tiene justificación técnica individual'),
  def(9, 3, B, 'Toda baja por inservible tiene cotización de reparación adjunta'),
  def(9, 4, B, 'Toda baja por caso fortuito tiene acta de faltante y reporte'),
  def(9, 5, B, 'Toda propuesta está certificada por un especialista identificado'),
  def(9, 6, B, 'Ninguna baja se ejecuta sin acta de aprobación del Comité'),
  def(9, 7, B, 'El valor neto de las bajas está calculado y cuadra con el paso 06'),
  def(9, 8, A, 'Bien con índice bajo (< 0,50) propuesto para baja por obsolescencia'),
  def(9, 9, A, 'Bien totalmente depreciado y funcional propuesto para baja'),
  def(9, 10, A, 'Más del 30% de una clase propuesta para baja (riesgo de habilitación)'),
  def(9, 11, A, 'Baja aprobada sin destino final definido'),
  def(9, 12, A, 'Baja ejecutada sin certificado de disposición ambiental'),
]);

export const VALIDACIONES: readonly DefinicionValidacion[] = Object.freeze([
  ...VALIDACIONES_PASO_01,
  ...VALIDACIONES_PASO_02,
  ...VALIDACIONES_PASO_03,
  ...VALIDACIONES_PASO_05,
  ...VALIDACIONES_PASO_06,
  ...VALIDACIONES_PASO_09,
]);

export function validacionesDelPaso(paso: number): readonly DefinicionValidacion[] {
  return VALIDACIONES.filter((v) => v.paso === paso);
}

/** Pasos cuyas validaciones ya están declaradas (los demás llegan con sus hitos). */
export const PASOS_CON_VALIDACIONES: readonly number[] = Object.freeze([...new Set(VALIDACIONES.map((v) => v.paso))]);
