/**
 * Predicados de la revisión de la configuración (paso 01 §8). Los metadatos viven en
 * `compartido/reglas/validaciones`; el motor (`modules/validaciones`) los evalúa.
 */
import type { MapaPredicados } from '../../validaciones';
import { OK, falla, listar } from '../../validaciones';
import { procesoRepo } from '../repositorio/proceso.repo';
import { sedeRepo } from '../repositorio/sede.repo';
import { servicioRepo } from '../repositorio/servicio.repo';
import { claseRepo } from '../repositorio/clase.repo';
import { convencionRepo } from '../repositorio/convencion.repo';

export const PREDICADOS_CONFIGURACION: MapaPredicados = {
  'VAL-01-01': (ctx, procesoId) => {
    const e = procesoRepo.porId(ctx.db, procesoId);
    if (e === null) return falla('La entidad no existe');
    const faltan = [e.razonSocial.trim() === '' ? 'razón social' : null, e.nit.trim() === '' ? 'NIT' : null].filter((x) => x !== null);
    return faltan.length === 0 ? OK : falla(`Falta: ${faltan.join(', ')}`);
  },
  'VAL-01-02': (ctx, procesoId) => (sedeRepo.listar(ctx.db, procesoId, false).length > 0 ? OK : falla('No hay sedes activas')),
  'VAL-01-03': (ctx, procesoId) => (servicioRepo.listarPorProceso(ctx.db, procesoId, false).length > 0 ? OK : falla('No hay servicios activos')),
  'VAL-01-04': (ctx, procesoId) => {
    const sinVida = claseRepo.listar(ctx.db, procesoId, false).filter((c) => c.esDepreciable && (c.vidaUtilContableMeses === null || c.vidaUtilContableMeses <= 0));
    return sinVida.length === 0 ? OK : falla(`Sin vida útil contable: ${listar(sinVida.map((c) => c.codigo))}`);
  },
  'VAL-01-05': (ctx, procesoId) => {
    const sinSubcuenta = claseRepo.listar(ctx.db, procesoId, false).filter((c) => c.subcuentaContable.trim() === '');
    return sinSubcuenta.length === 0 ? OK : falla(`Sin subcuenta: ${listar(sinSubcuenta.map((c) => c.codigo))}`);
  },
  'VAL-01-09': (ctx, procesoId) => {
    const distintas = claseRepo
      .listar(ctx.db, procesoId, false)
      .filter((c) => c.vidaUtilContableMeses !== null && c.vidaUtilTecnicaAnios !== null && Math.abs(c.vidaUtilTecnicaAnios * 12 - c.vidaUtilContableMeses) > 0.0001);
    return distintas.length === 0 ? OK : falla(`Vida técnica ≠ contable en: ${listar(distintas.map((c) => c.codigo))}`);
  },
  'VAL-01-10': (ctx, procesoId) => (convencionRepo.obtener(ctx.db, procesoId).definida ? OK : falla('Se usará la convención genérica SEDE-TIPO-CONSECUTIVO')),
};
