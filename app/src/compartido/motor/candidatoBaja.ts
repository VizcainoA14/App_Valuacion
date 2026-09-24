/**
 * ANEXO_C §2.7 — criterio de candidato a baja.
 *
 * Devuelve **los motivos**, no solo un booleano: la propuesta de baja va a una
 * resolución firmada por el Gerente, y "el sistema lo marcó" no es una motivación
 * admisible. Se acumulan todos los criterios que se cumplen, no solo el primero.
 *
 * Ser candidato no da de baja nada: abre la propuesta que el Comité decide
 * (paso 09). El motor sugiere; las personas resuelven.
 */
import type { EstadoActual, EstadoOperativo } from '../enums/catalogos';
import type { Decimal } from './dinero';

export interface EntradaCandidatoBaja {
  /** Nulo cuando la obsolescencia no fue calculable; los demás criterios siguen valiendo. */
  readonly indiceObsolescencia: Decimal | null;
  readonly estadoActual: EstadoActual;
  readonly estadoOperativo: EstadoOperativo | null;
  /** Dictamen del especialista: sirve, pero ya no cumple la función que se le pide. */
  readonly obsolescenciaFuncional: boolean;
  readonly tieneMantenimientoCorrectivoFallido: boolean;
  /** Frontera del criterio "índice alto"; ANEXO_B §2.5 lo trae como parámetro. */
  readonly umbralAmarillo: number;
}

export interface ResultadoCandidatoBaja {
  readonly esCandidato: boolean;
  readonly motivos: readonly string[];
}

const ESTADOS_QUE_JUSTIFICAN_BAJA: readonly EstadoActual[] = ['MALO', 'INSERVIBLE'];

export function esCandidatoBaja(e: EntradaCandidatoBaja): ResultadoCandidatoBaja {
  const motivos: string[] = [];
  const indice = e.indiceObsolescencia;

  if (indice !== null && indice.gte(1)) {
    motivos.push(`Superó su vida útil técnica: índice de obsolescencia ${indice.toFixed(4)}.`);
  }
  // /especificacion/teoria escribe "≥ 0,81" frente a un umbral amarillo de 0,80. Con índices de
  // cuatro decimales eso deja fuera el tramo 0,8001–0,8099, que es el mismo hueco
  // que corrigió CT-04: se lee como "por encima del umbral amarillo".
  if (indice !== null && indice.gt(e.umbralAmarillo) && ESTADOS_QUE_JUSTIFICAN_BAJA.includes(e.estadoActual)) {
    motivos.push(`Índice ${indice.toFixed(4)} por encima del umbral amarillo y estado físico ${e.estadoActual}.`);
  }
  if (e.obsolescenciaFuncional) {
    motivos.push('Obsolescencia funcional declarada: ya no cumple la función que se le exige.');
  }
  if (e.estadoOperativo === 'NO_OPERATIVO' && e.tieneMantenimientoCorrectivoFallido) {
    motivos.push('No operativo y con un mantenimiento correctivo fallido registrado.');
  }

  return { esCandidato: motivos.length > 0, motivos };
}
