/**
 * Predicados de VAL-03-01 … VAL-03-08 (paso 03 §8).
 * "Justificación registrada" (VAL-03-03) y "exención" (VAL-03-04) se acreditan
 * con un soporte documental del tipo correspondiente (RN-03-04: acta del
 * especialista; nunca un dato inventado sin acta).
 */
import type { MapaPredicados } from '../../validaciones';
import { OK, falla, listar } from '../../validaciones';
import type { ContextoIpc } from '../../../ipc/registroIpc';
import { sumarDias } from '../../../../compartido/motor/fechas';
import { comoFechaIso } from '../../../../compartido/tipos/basicos';

export const TIPO_SOPORTE_RECONOCIMIENTO_INICIAL = 'AVALUO_RECONOCIMIENTO_INICIAL';
export const TIPO_SOPORTE_EXENCION_INVIMA = 'EXENCION_INVIMA';

type Fila = Record<string, string | number | null>;

function filas(ctx: ContextoIpc, sql: string, ...params: unknown[]): Fila[] {
  return ctx.sqlite.prepare(sql).all(...params) as Fila[];
}

function fechaCorte(ctx: ContextoIpc, ejercicioId: string): string | null {
  const f = ctx.sqlite.prepare('SELECT fecha_corte FROM ejercicio WHERE id = ?').get(ejercicioId) as { fecha_corte: string } | undefined;
  return f?.fecha_corte ?? null;
}

const sinEjercicio = falla('No hay ejercicio seleccionado');
/** Solo los bienes propios entran al patrimonio (RN-02-04); los demás no exigen datos económicos. */
const PROPIOS = `b.ejercicio_id = ? AND b.condicion_tenencia = 'PROPIO' AND b.estado_registro <> 'DADO_DE_BAJA'`;

export const PREDICADOS_PASO_03: MapaPredicados = {
  'VAL-03-01': (ctx, _e, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    const sin = filas(
      ctx,
      `SELECT b.codigo_institucional AS c FROM bien b JOIN clase_activo k ON k.id = b.clase_activo_id
       WHERE ${PROPIOS} AND k.requiere_hoja_vida = 1 AND NOT EXISTS (SELECT 1 FROM hoja_vida h WHERE h.bien_id = b.id)`,
      ejercicioId,
    );
    return sin.length === 0 ? OK : falla(`Sin hoja de vida: ${listar(sin.map((f) => String(f['c'])))}`);
  },
  'VAL-03-02': (ctx, _e, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    const corte = fechaCorte(ctx, ejercicioId);
    if (corte === null) return falla('El ejercicio no existe');
    const malas = filas(
      ctx,
      `SELECT b.codigo_institucional AS c, h.fecha_adquisicion AS f FROM bien b JOIN hoja_vida h ON h.bien_id = b.id
       WHERE ${PROPIOS} AND (h.fecha_adquisicion IS NULL OR h.fecha_adquisicion > ?)`,
      ejercicioId,
      corte,
    );
    return malas.length === 0 ? OK : falla(`Fecha de adquisición ausente o posterior al corte: ${listar(malas.map((f) => String(f['c'])))}`);
  },
  'VAL-03-03': (ctx, _e, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    const sinCosto = filas(
      ctx,
      `SELECT b.codigo_institucional AS c FROM bien b JOIN hoja_vida h ON h.bien_id = b.id
       WHERE ${PROPIOS} AND (h.costo_adquisicion_cent IS NULL OR h.costo_adquisicion_cent <= 0)
         AND NOT EXISTS (SELECT 1 FROM soporte_documental s WHERE s.bien_id = b.id AND s.tipo_documento = ?)`,
      ejercicioId,
      TIPO_SOPORTE_RECONOCIMIENTO_INICIAL,
    );
    return sinCosto.length === 0 ? OK : falla(`Sin costo ni acta de reconocimiento inicial (RN-03-04): ${listar(sinCosto.map((f) => String(f['c'])))}`);
  },
  'VAL-03-04': (ctx, _e, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    const sinInvima = filas(
      ctx,
      `SELECT b.codigo_institucional AS c FROM bien b JOIN clase_activo k ON k.id = b.clase_activo_id
         LEFT JOIN hoja_vida h ON h.bien_id = b.id
       WHERE ${PROPIOS} AND k.requiere_invima = 1
         AND (h.registro_invima IS NULL OR trim(h.registro_invima) = '')
         AND NOT EXISTS (SELECT 1 FROM soporte_documental s WHERE s.bien_id = b.id AND s.tipo_documento = ?)`,
      ejercicioId,
      TIPO_SOPORTE_EXENCION_INVIMA,
    );
    return sinInvima.length === 0 ? OK : falla(`Sin registro INVIMA ni exención: ${listar(sinInvima.map((f) => String(f['c'])))}`);
  },
  'VAL-03-05': (ctx, _e, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    const corte = fechaCorte(ctx, ejercicioId);
    if (corte === null) return falla('El ejercicio no existe');
    const desde = sumarDias(comoFechaIso(corte), -730);
    const sinMantenimiento = filas(
      ctx,
      `SELECT b.codigo_institucional AS c FROM bien b JOIN clase_activo k ON k.id = b.clase_activo_id
       WHERE ${PROPIOS} AND k.requiere_hoja_vida = 1
         AND NOT EXISTS (SELECT 1 FROM mantenimiento m WHERE m.bien_id = b.id AND m.fecha >= ? AND m.fecha <= ?)`,
      ejercicioId,
      desde,
      corte,
    );
    return sinMantenimiento.length === 0 ? OK : falla(`Sin mantenimiento desde ${desde}: ${listar(sinMantenimiento.map((f) => String(f['c'])))}`);
  },
  'VAL-03-06': (ctx, _e, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    // Atípico: se aparta más de 3× (o menos de 1/3) de la mediana de su misma descripción, con ≥ 3 bienes.
    const grupos = filas(
      ctx,
      `SELECT upper(trim(b.descripcion_funcional)) AS d, b.codigo_institucional AS c, h.costo_adquisicion_cent AS v
       FROM bien b JOIN hoja_vida h ON h.bien_id = b.id
       WHERE ${PROPIOS} AND h.costo_adquisicion_cent > 0 ORDER BY d, v`,
      ejercicioId,
    );
    const porDescripcion = new Map<string, { c: string; v: number }[]>();
    for (const g of grupos) porDescripcion.set(String(g['d']), [...(porDescripcion.get(String(g['d'])) ?? []), { c: String(g['c']), v: Number(g['v']) }]);
    const atipicos: string[] = [];
    for (const lista of porDescripcion.values()) {
      if (lista.length < 3) continue;
      const mediana = lista[Math.floor(lista.length / 2)]?.v ?? 0;
      for (const { c, v } of lista) if (v > mediana * 3 || v < mediana / 3) atipicos.push(c);
    }
    return atipicos.length === 0 ? OK : falla(`Costo atípico frente a su descripción: ${listar(atipicos)}`);
  },
  // La fecha de creación de la entidad no está modelada en ANEXO_B (CT-19): no se puede evaluar.
  'VAL-03-07': () => OK,
  'VAL-03-08': (ctx, _e, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    const sinSoporte = filas(
      ctx,
      `SELECT b.codigo_institucional AS c FROM bien b JOIN hoja_vida h ON h.bien_id = b.id
       WHERE ${PROPIOS} AND NOT EXISTS (SELECT 1 FROM soporte_documental s WHERE s.bien_id = b.id)`,
      ejercicioId,
    );
    return sinSoporte.length === 0 ? OK : falla(`Sin soporte adjunto: ${listar(sinSoporte.map((f) => String(f['c'])))}`);
  },
};
