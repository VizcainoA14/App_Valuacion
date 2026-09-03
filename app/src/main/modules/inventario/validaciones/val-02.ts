/**
 * Predicados de VAL-02-01 … VAL-02-09 (paso 02 §8), sobre el ejercicio.
 * Cobertura (VAL-02-05): un servicio activo cuenta como recorrido si tiene al
 * menos un bien o un acta de custodia/cierre en el ejercicio (EN-02-03/06).
 */
import type { MapaPredicados } from '../../validaciones';
import { OK, falla, listar } from '../../validaciones';
import type { ContextoIpc } from '../../../ipc/registroIpc';

type Fila = Record<string, string | number | null>;

function filas(ctx: ContextoIpc, sql: string, ...params: unknown[]): Fila[] {
  return ctx.sqlite.prepare(sql).all(...params) as Fila[];
}

const sinEjercicio = falla('No hay ejercicio seleccionado');

export const PREDICADOS_PASO_02: MapaPredicados = {
  'VAL-02-01': (ctx, _e, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    const dup = filas(ctx, `SELECT codigo_institucional AS c FROM bien WHERE ejercicio_id = ? GROUP BY codigo_institucional HAVING COUNT(*) > 1`, ejercicioId);
    return dup.length === 0 ? OK : falla(`Códigos repetidos: ${listar(dup.map((f) => String(f['c'])))}`);
  },
  'VAL-02-02': (ctx, _e, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    const dup = filas(ctx, `SELECT placa AS p FROM bien WHERE ejercicio_id = ? GROUP BY placa HAVING COUNT(*) > 1`, ejercicioId);
    return dup.length === 0 ? OK : falla(`Placas repetidas: ${listar(dup.map((f) => String(f['p'])))}`);
  },
  'VAL-02-03': (ctx, _e, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    const malos = filas(
      ctx,
      `SELECT b.codigo_institucional AS c FROM bien b
         JOIN clase_activo k ON k.id = b.clase_activo_id
         JOIN sede s ON s.id = b.sede_id
         JOIN servicio v ON v.id = b.servicio_id
       WHERE b.ejercicio_id = ? AND (k.activo = 0 OR s.activa = 0 OR v.activo = 0 OR v.sede_id <> b.sede_id)`,
      ejercicioId,
    );
    return malos.length === 0 ? OK : falla(`Clase, sede o servicio inactivo o incoherente en: ${listar(malos.map((f) => String(f['c'])))}`);
  },
  'VAL-02-04': (ctx, _e, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    const n = filas(ctx, `SELECT COUNT(*) AS n FROM bien WHERE ejercicio_id = ? AND (estado_actual IS NULL OR condicion_tenencia IS NULL)`, ejercicioId)[0]?.['n'];
    return Number(n) === 0 ? OK : falla(`${String(n)} bienes sin estado o condición de tenencia`);
  },
  'VAL-02-05': (ctx, entidadId, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    const sinRecorrer = filas(
      ctx,
      `SELECT s.codigo || '/' || v.codigo AS c FROM servicio v JOIN sede s ON s.id = v.sede_id
       WHERE s.entidad_id = ? AND v.activo = 1 AND s.activa = 1
         AND NOT EXISTS (SELECT 1 FROM bien b WHERE b.ejercicio_id = ? AND b.servicio_id = v.id)
         AND NOT EXISTS (SELECT 1 FROM acta_custodia a WHERE a.ejercicio_id = ? AND a.servicio_id = v.id)`,
      entidadId,
      ejercicioId,
      ejercicioId,
    );
    return sinRecorrer.length === 0 ? OK : falla(`Sin recorrer: ${listar(sinRecorrer.map((f) => String(f['c'])))}`);
  },
  'VAL-02-06': (ctx, _e, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    const sinFoto = filas(
      ctx,
      `SELECT b.codigo_institucional AS c FROM bien b WHERE b.ejercicio_id = ? AND b.estado_actual IN ('MALO', 'INSERVIBLE')
         AND NOT EXISTS (SELECT 1 FROM foto_bien f WHERE f.bien_id = b.id)`,
      ejercicioId,
    );
    return sinFoto.length === 0 ? OK : falla(`Sin fotografía: ${listar(sinFoto.map((f) => String(f['c'])))}`);
  },
  'VAL-02-07': (ctx, _e, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    const dup = filas(ctx, `SELECT serie AS s FROM bien WHERE ejercicio_id = ? AND serie IS NOT NULL AND trim(serie) <> '' GROUP BY upper(trim(serie)) HAVING COUNT(*) > 1`, ejercicioId);
    return dup.length === 0 ? OK : falla(`Series repetidas: ${listar(dup.map((f) => String(f['s'])))}`);
  },
  'VAL-02-08': (ctx, entidadId, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    const vacios = filas(
      ctx,
      `SELECT s.codigo || '/' || v.codigo AS c FROM servicio v JOIN sede s ON s.id = v.sede_id
       WHERE s.entidad_id = ? AND v.activo = 1 AND s.activa = 1
         AND NOT EXISTS (SELECT 1 FROM bien b WHERE b.ejercicio_id = ? AND b.servicio_id = v.id)`,
      entidadId,
      ejercicioId,
    );
    return vacios.length === 0 ? OK : falla(`Sin bienes: ${listar(vacios.map((f) => String(f['c'])))}`);
  },
  'VAL-02-09': (ctx, _e, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    const sinCustodio = filas(ctx, `SELECT codigo_institucional AS c FROM bien WHERE ejercicio_id = ? AND (responsable_custodia IS NULL OR trim(responsable_custodia) = '')`, ejercicioId);
    return sinCustodio.length === 0 ? OK : falla(`Sin responsable de custodia: ${listar(sinCustodio.map((f) => String(f['c'])))}`);
  },
};
