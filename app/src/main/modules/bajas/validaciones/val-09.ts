/**
 * Predicados de `VAL-09-01` … `VAL-09-12` (paso 09 §8).
 *
 * Las bloqueantes que dependen del Comité (`VAL-09-06`) y de la disposición
 * ambiental (`VAL-09-12`) se evalúan sobre lo que hay: mientras ninguna propuesta
 * llegue a EJECUTADO no pueden fallar, y esa parte del flujo es la extensión del
 * paso 09-10. Se dejan activas para que empiecen a valer solas cuando exista.
 */
import type { MapaPredicados } from '../../validaciones';
import { OK, falla, listar } from '../../validaciones';
import type { ContextoIpc } from '../../../ipc/registroIpc';
import { EsquemaParametrosCalculo } from '../../../../compartido/parametros/parametrosCalculo';

type Fila = Record<string, string | number | null>;

function filas(ctx: ContextoIpc, sql: string, ...params: unknown[]): Fila[] {
  return ctx.sqlite.prepare(sql).all(...params) as Fila[];
}

const sinEjercicio = falla('No hay ejercicio seleccionado');
/** Las rechazadas no cuentan: el bien volvió al inventario activo (RN-09-04). */
const VIVAS = `p.ejercicio_id = ? AND p.estado_aprobacion <> 'RECHAZADO'`;

const codigos = (f: Fila[]): string[] => f.map((x) => String(x['c']));

export const PREDICADOS_PASO_09: MapaPredicados = {
  'VAL-09-01': (ctx, _e, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    // La causal es NOT NULL con CHECK en la base: si esto falla, algo escribió por fuera.
    const sin = filas(ctx, `SELECT b.codigo_institucional AS c FROM propuesta_baja p JOIN bien b ON b.id = p.bien_id WHERE ${VIVAS} AND (p.causal IS NULL OR trim(p.causal) = '')`, ejercicioId);
    return sin.length === 0 ? OK : falla(`Sin causal de baja: ${listar(codigos(sin))}`);
  },

  'VAL-09-02': (ctx, _e, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    const sin = filas(
      ctx,
      `SELECT b.codigo_institucional AS c FROM propuesta_baja p JOIN bien b ON b.id = p.bien_id
        WHERE ${VIVAS} AND length(trim(p.justificacion_tecnica)) < 20`,
      ejercicioId,
    );
    return sin.length === 0 ? OK : falla(`Justificación técnica insuficiente (RN-09-06): ${listar(codigos(sin))}`);
  },

  'VAL-09-03': (ctx, _e, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    const sin = filas(
      ctx,
      `SELECT b.codigo_institucional AS c FROM propuesta_baja p JOIN bien b ON b.id = p.bien_id
        WHERE ${VIVAS} AND p.causal = 'INSERVIBLE'
          AND (p.costo_reparacion_estimado_cent IS NULL OR p.valor_reposicion_cent IS NULL)`,
      ejercicioId,
    );
    return sin.length === 0 ? OK : falla(`Baja por inservible sin cotización de reparación ni valor de reposición (RN-09-03): ${listar(codigos(sin))}`);
  },

  'VAL-09-04': (ctx, _e, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    // El acta de faltante y el reporte a Control Interno se acreditan con un
    // soporte documental del bien; sin almacén de soportes (T-C-05) se comprueba
    // que al menos exista uno adjunto.
    const sin = filas(
      ctx,
      `SELECT b.codigo_institucional AS c FROM propuesta_baja p JOIN bien b ON b.id = p.bien_id
        WHERE ${VIVAS} AND p.causal = 'CASO_FORTUITO'
          AND p.soporte_url IS NULL
          AND NOT EXISTS (SELECT 1 FROM soporte_documental s WHERE s.bien_id = b.id)`,
      ejercicioId,
    );
    return sin.length === 0 ? OK : falla(`Baja por caso fortuito sin acta de faltante ni reporte adjunto (RN-09-07): ${listar(codigos(sin))}`);
  },

  'VAL-09-05': (ctx, _e, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    const sin = filas(
      ctx,
      `SELECT b.codigo_institucional AS c FROM propuesta_baja p JOIN bien b ON b.id = p.bien_id
         LEFT JOIN responsable r ON r.id = p.especialista_id
        WHERE ${VIVAS} AND (r.id IS NULL OR r.activo = 0)`,
      ejercicioId,
    );
    return sin.length === 0 ? OK : falla(`Propuesta sin especialista identificado y activo: ${listar(codigos(sin))}`);
  },

  'VAL-09-06': (ctx, _e, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    const sin = filas(
      ctx,
      `SELECT b.codigo_institucional AS c FROM propuesta_baja p JOIN bien b ON b.id = p.bien_id
        WHERE ${VIVAS} AND p.estado_aprobacion IN ('EJECUTADO', 'DISPOSICION_DOCUMENTADA') AND p.acta_comite_id IS NULL`,
      ejercicioId,
    );
    return sin.length === 0 ? OK : falla(`Baja ejecutada sin acta del Comité (INT-07): ${listar(codigos(sin))}`);
  },

  'VAL-09-07': (ctx, _e, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    // El valor neto de la baja tiene que salir del paso 06, no de otra fuente.
    const sin = filas(
      ctx,
      `SELECT b.codigo_institucional AS c FROM propuesta_baja p JOIN bien b ON b.id = p.bien_id
        WHERE ${VIVAS} AND NOT EXISTS (
          SELECT 1 FROM calculo_depreciacion d WHERE d.bien_id = p.bien_id AND d.ejercicio_id = p.ejercicio_id)`,
      ejercicioId,
    );
    return sin.length === 0
      ? OK
      : falla(`Propuestas cuyo valor neto no está calculado en el paso 06 (recalcule antes de cerrar): ${listar(codigos(sin))}`);
  },

  'VAL-09-08': (ctx, _e, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    const bajos = filas(
      ctx,
      `SELECT b.codigo_institucional AS c FROM propuesta_baja p JOIN bien b ON b.id = p.bien_id
         JOIN calculo_obsolescencia o ON o.bien_id = b.id AND o.ejercicio_id = p.ejercicio_id
        WHERE ${VIVAS} AND p.causal = 'OBSOLESCENCIA' AND o.indice_obsolescencia_x10k < 5000`,
      ejercicioId,
    );
    return bajos.length === 0 ? OK : falla(`Propuestos por obsolescencia con índice menor que 0,50: ${listar(codigos(bajos))}`);
  },

  'VAL-09-09': (ctx, _e, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    const funcionales = filas(
      ctx,
      `SELECT b.codigo_institucional AS c FROM propuesta_baja p JOIN bien b ON b.id = p.bien_id
         JOIN calculo_depreciacion d ON d.bien_id = b.id AND d.ejercicio_id = p.ejercicio_id
         LEFT JOIN hoja_vida h ON h.bien_id = b.id
        WHERE ${VIVAS} AND d.totalmente_depreciado = 1
          AND b.estado_actual IN ('BUENO', 'REGULAR')
          AND (h.estado_operativo IS NULL OR h.estado_operativo = 'OPERATIVO')`,
      ejercicioId,
    );
    return funcionales.length === 0
      ? OK
      : falla(`Totalmente depreciados pero funcionales: estar depreciado no es motivo de baja. ${listar(codigos(funcionales))}`);
  },

  'VAL-09-10': (ctx, entidadId, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    const porClase = filas(
      ctx,
      `SELECT k.codigo AS c, COUNT(*) AS vivos,
              SUM(CASE WHEN p.id IS NOT NULL THEN 1 ELSE 0 END) AS propuestos
         FROM bien b
           JOIN clase_activo k ON k.id = b.clase_activo_id
           LEFT JOIN propuesta_baja p ON p.bien_id = b.id AND p.ejercicio_id = b.ejercicio_id AND p.estado_aprobacion <> 'RECHAZADO'
        WHERE b.ejercicio_id = ? AND b.estado_registro <> 'DADO_DE_BAJA'
        GROUP BY k.codigo`,
      ejercicioId,
    );
    void entidadId;
    const criticas = porClase.filter((f) => Number(f['vivos']) > 0 && Number(f['propuestos']) / Number(f['vivos']) > 0.3);
    return criticas.length === 0
      ? OK
      : falla(`Más del 30 % de estas clases se propone para baja; puede afectar la habilitación del servicio: ${listar(criticas.map((f) => `${String(f['c'])} (${f['propuestos']}/${f['vivos']})`))}`);
  },

  'VAL-09-11': (ctx, _e, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    const sin = filas(
      ctx,
      `SELECT b.codigo_institucional AS c FROM propuesta_baja p JOIN bien b ON b.id = p.bien_id
        WHERE ${VIVAS} AND p.estado_aprobacion <> 'PROPUESTO' AND p.estado_aprobacion <> 'EN_REVISION'
          AND p.destino_final_propuesto IS NULL`,
      ejercicioId,
    );
    return sin.length === 0 ? OK : falla(`Aprobadas sin destino final definido: ${listar(codigos(sin))}`);
  },

  'VAL-09-12': (ctx, _e, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    const sin = filas(
      ctx,
      `SELECT b.codigo_institucional AS c FROM propuesta_baja p JOIN bien b ON b.id = p.bien_id
         LEFT JOIN disposicion_final f ON f.propuesta_baja_id = p.id
        WHERE ${VIVAS} AND p.estado_aprobacion IN ('EJECUTADO', 'DISPOSICION_DOCUMENTADA')
          AND (f.id IS NULL OR f.certificado_url IS NULL)`,
      ejercicioId,
    );
    return sin.length === 0 ? OK : falla(`Ejecutadas sin certificado de disposición ambiental (RN-09-08): ${listar(codigos(sin))}`);
  },
};

/** El umbral de reparación con el que la interfaz explica RN-09-03. */
export function umbralReparacion(ctx: ContextoIpc, ejercicioId: string): number {
  const fila = ctx.sqlite.prepare('SELECT parametros_congelados_json AS j FROM ejercicio WHERE id = ?').get(ejercicioId) as { j: string } | undefined;
  if (fila === undefined) return 50;
  return EsquemaParametrosCalculo.parse(JSON.parse(fila.j)).umbral_reparacion_baja_pct;
}
