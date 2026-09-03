/**
 * Predicados de VAL-01-01 … VAL-01-10 (paso 01 §8). Los metadatos viven en
 * `compartido/reglas/validaciones`; el motor (`modules/validaciones`) los evalúa.
 */
import type { MapaPredicados } from '../../validaciones';
import { OK, falla, listar } from '../../validaciones';
import { entidadRepo } from '../repositorio/entidad.repo';
import { sedeRepo } from '../repositorio/sede.repo';
import { servicioRepo } from '../repositorio/servicio.repo';
import { claseRepo } from '../repositorio/clase.repo';
import { parametroRepo } from '../repositorio/parametro.repo';
import { convencionRepo } from '../repositorio/convencion.repo';
import { ejercicioRepo } from '../repositorio/ejercicio.repo';
import { hoyIso } from '../casos-uso/ejercicios';

export const PREDICADOS_PASO_01: MapaPredicados = {
  'VAL-01-01': (ctx, entidadId) => {
    const e = entidadRepo.porId(ctx.db, entidadId);
    if (e === null) return falla('La entidad no existe');
    const faltan = [e.razonSocial.trim() === '' ? 'razón social' : null, e.nit.trim() === '' ? 'NIT' : null].filter((x) => x !== null);
    return faltan.length === 0 ? OK : falla(`Falta: ${faltan.join(', ')}`);
  },
  'VAL-01-02': (ctx, entidadId) => (sedeRepo.listar(ctx.db, entidadId, false).length > 0 ? OK : falla('No hay sedes activas')),
  'VAL-01-03': (ctx, entidadId) => (servicioRepo.listarPorEntidad(ctx.db, entidadId, false).length > 0 ? OK : falla('No hay servicios activos')),
  'VAL-01-04': (ctx, entidadId) => {
    const sinVida = claseRepo.listar(ctx.db, entidadId, false).filter((c) => c.esDepreciable && (c.vidaUtilContableMeses === null || c.vidaUtilContableMeses <= 0));
    return sinVida.length === 0 ? OK : falla(`Sin vida útil contable: ${listar(sinVida.map((c) => c.codigo))}`);
  },
  'VAL-01-05': (ctx, entidadId) => {
    const sinSubcuenta = claseRepo.listar(ctx.db, entidadId, false).filter((c) => c.subcuentaContable.trim() === '');
    return sinSubcuenta.length === 0 ? OK : falla(`Sin subcuenta: ${listar(sinSubcuenta.map((c) => c.codigo))}`);
  },
  'VAL-01-06': (ctx, _entidadId, ejercicioId) => {
    if (ejercicioId === null) return falla('No hay ejercicio creado');
    const ej = ejercicioRepo.porId(ctx.db, ejercicioId);
    if (ej === null) return falla('El ejercicio no existe');
    return ej.fechaCorte <= hoyIso(ctx) ? OK : falla(`La fecha de corte ${ej.fechaCorte} es futura`);
  },
  'VAL-01-07': (ctx, entidadId) => {
    // CT-02: el valor sugerido no cuenta; hace falta la confirmación por acta del contador (IN-06-04).
    const p = parametroRepo.obtener(ctx.db, entidadId);
    return p.metodo_conteo_meses_confirmado ? OK : falla(`Sugerido ${p.metodo_conteo_meses}; falta confirmarlo por acta con el contador`);
  },
  'VAL-01-08': () => falla('El Manual de Políticas Contables se adjunta desde el almacén de soportes (hito C)'),
  'VAL-01-09': (ctx, entidadId) => {
    const distintas = claseRepo
      .listar(ctx.db, entidadId, false)
      .filter((c) => c.vidaUtilContableMeses !== null && c.vidaUtilTecnicaAnios !== null && Math.abs(c.vidaUtilTecnicaAnios * 12 - c.vidaUtilContableMeses) > 0.0001);
    return distintas.length === 0 ? OK : falla(`Vida técnica ≠ contable en: ${listar(distintas.map((c) => c.codigo))}`);
  },
  'VAL-01-10': (ctx, entidadId) => (convencionRepo.obtener(ctx.db, entidadId).definida ? OK : falla('Se usará la convención genérica SEDE-TIPO-CONSECUTIVO')),
};
