/**
 * TR-01 — Motor de validaciones (T-C-01). Evalúa las definiciones declaradas en
 * `compartido/reglas/validaciones.ts` con los predicados que cada módulo de
 * dominio registra por código. Un código sin predicado se reporta como
 * pendiente de implementación en vez de pasar en silencio.
 */
import type { ContextoIpc } from '../../ipc/registroIpc';
import type { ResultadoValidacion, ResultadoValidaciones } from '../../../compartido/dtos/configuracion';
import { validacionesDelPaso, VALIDACIONES } from '../../../compartido/reglas/validaciones';

export interface Veredicto {
  readonly cumple: boolean;
  /** Qué falta exactamente, cuando no cumple: el usuario debe entender qué le impide avanzar. */
  readonly detalle?: string;
}

export type Predicado = (ctx: ContextoIpc, entidadId: string, ejercicioId: string | null) => Veredicto;
export type MapaPredicados = Readonly<Record<string, Predicado>>;

export const OK: Veredicto = { cumple: true };
export const falla = (detalle: string): Veredicto => ({ cumple: false, detalle });

const predicados = new Map<string, Predicado>();

export function registrarPredicados(mapa: MapaPredicados): void {
  for (const [codigo, predicado] of Object.entries(mapa)) {
    if (!VALIDACIONES.some((v) => v.codigo === codigo)) {
      throw new Error(`El predicado ${codigo} no tiene definición en compartido/reglas/validaciones.ts`);
    }
    if (predicados.has(codigo)) throw new Error(`El predicado ${codigo} ya estaba registrado`);
    predicados.set(codigo, predicado);
  }
}

/** Códigos definidos que aún no tienen predicado (deben ser cero al cerrar cada hito). */
export function codigosSinPredicado(): string[] {
  return VALIDACIONES.map((v) => v.codigo).filter((c) => !predicados.has(c));
}

export function evaluarPaso(paso: number, entidadId: string, ejercicioId: string | null, ctx: ContextoIpc): ResultadoValidaciones {
  const resultados: ResultadoValidacion[] = validacionesDelPaso(paso).map((def) => {
    const predicado = predicados.get(def.codigo);
    let v: Veredicto;
    try {
      v = predicado === undefined ? falla('Validación aún no implementada en la aplicación') : predicado(ctx, entidadId, ejercicioId);
    } catch (e) {
      v = falla(`No se pudo evaluar: ${e instanceof Error ? e.message : String(e)}`);
    }
    return { codigo: def.codigo, severidad: def.severidad, cumple: v.cumple, mensaje: def.mensaje, detalle: v.cumple ? null : (v.detalle ?? null) };
  });
  const bloqueantesPendientes = resultados.filter((r) => r.severidad === 'BLOQUEANTE' && !r.cumple).length;
  const advertencias = resultados.filter((r) => r.severidad === 'ADVERTENCIA' && !r.cumple).length;
  return { paso, resultados, bloqueantesPendientes, advertencias, puedeAvanzar: bloqueantesPendientes === 0 };
}

/** Formatea una lista de códigos para el detalle sin desbordar la interfaz. */
export function listar(codigos: readonly string[], maximo = 8): string {
  const vista = codigos.slice(0, maximo).join(', ');
  return codigos.length > maximo ? `${vista} y ${codigos.length - maximo} más` : vista;
}
