/**
 * Paso 09 — candidatos a baja y registro de las bajas (ADR-028).
 *
 * La aplicación **señala** candidatos con su motivo y **registra** lo que el
 * hospital decidió. No aprueba nada ni exige el acta: el comité, la resolución
 * y la disposición final ocurren fuera de ella, y de ese trámite solo se anota
 * —si se quiere— el número del documento. Lo que sí se exige es lo que hace
 * útil al registro: una justificación individual (RN-09-06).
 */
import type { ContextoIpc } from '../../../ipc/registroIpc';
import type { EntradaValidadaDe } from '../../../../compartido/ipc/contrato';
import type { BajaDto, CandidatoBajaDto } from '../../../../compartido/dtos/bajas';
import type { Centavos, FechaIso, MarcaTiempo, Uuid } from '../../../../compartido/tipos/basicos';
import type { CausalBaja, EstadoActual, Semaforo } from '../../../../compartido/enums/catalogos';
import type { EstadoBien } from '../../../../compartido/enums/estados';
import { ErrorReglaNegocio, ErrorValidacion } from '../../../../compartido/errores';
import { nuevoId } from '../../../infraestructura/db/identificadores';
import { exigirCorte } from '../../calculo';
import { bajaRepo, type FilaBaja, type FilaCandidato } from '../repositorio/baja.repo';

const X10K = 10_000;

/**
 * La causal que la app propone al abrir el formulario. Es una **sugerencia**: la
 * fija quien registra la baja. Un bien inservible se da de baja por inservible
 * aunque su índice sea bajo, y al revés.
 */
function causalSugerida(f: FilaCandidato): CausalBaja {
  if (f.estado_actual === 'INSERVIBLE') return 'INSERVIBLE';
  if (f.obsolescencia_funcional === 1 || f.indice_obsolescencia_x10k >= X10K) return 'OBSOLESCENCIA';
  if (f.estado_actual === 'MALO') return 'INSERVIBLE';
  return 'DESUSO';
}

function motivos(f: FilaCandidato): string[] {
  try {
    const m = JSON.parse(f.motivos_baja ?? '[]') as unknown;
    return Array.isArray(m) ? m.map(String) : [];
  } catch {
    return [];
  }
}

export function listarCandidatos(e: EntradaValidadaDe<'baja:candidatos'>, ctx: ContextoIpc): CandidatoBajaDto[] {
  exigirCorte(ctx, e.corteId);
  return bajaRepo.candidatos(ctx.sqlite, e.corteId, e.incluirYaDadosDeBaja).map((f) => ({
    bienId: f.bien_id as Uuid,
    codigoInstitucional: f.codigo_institucional,
    descripcionFuncional: f.descripcion_funcional,
    claseCodigo: f.clase_codigo,
    claseNombre: f.clase_nombre,
    servicioCodigo: f.servicio_codigo,
    estadoActual: f.estado_actual as EstadoActual,
    estadoRegistro: f.estado_registro as EstadoBien,
    indiceObsolescencia: f.indice_obsolescencia_x10k / X10K,
    semaforo: f.semaforo as Semaforo,
    obsolescenciaFuncional: f.obsolescencia_funcional === 1,
    motivos: motivos(f),
    causalSugerida: causalSugerida(f),
    valorNetoLibros: f.valor_neto_libros_cent === null ? null : (f.valor_neto_libros_cent as Centavos),
    saldoFinalAjustado: f.saldo_final_ajustado_cent === null ? null : (f.saldo_final_ajustado_cent as Centavos),
    totalmenteDepreciado: f.totalmente_depreciado === 1,
  }));
}

function aDto(f: FilaBaja): BajaDto {
  return {
    id: f.id as Uuid,
    bienId: f.bien_id as Uuid,
    codigoInstitucional: f.codigo_institucional,
    descripcionFuncional: f.descripcion_funcional,
    claseCodigo: f.clase_codigo,
    servicioCodigo: f.servicio_codigo,
    fecha: f.fecha as FechaIso,
    causal: f.causal as CausalBaja,
    justificacion: f.justificacion,
    referencia: f.referencia,
    registradaEn: f.creado_en as MarcaTiempo,
    anuladaEn: f.anulada_en as MarcaTiempo | null,
    motivoAnulacion: f.motivo_anulacion,
  };
}

export function listarBajas(e: EntradaValidadaDe<'baja:listar'>, ctx: ContextoIpc): BajaDto[] {
  return bajaRepo.listar(ctx.sqlite, e.procesoId, e.incluirAnuladas).map(aDto);
}

/** Justificaciones que no dicen nada: RN-09-06 exige el motivo específico del bien. */
const JUSTIFICACIONES_GENERICAS = new Set(['BAJA', 'DAR DE BAJA', 'OBSOLETO', 'OBSOLETA', 'INSERVIBLE', 'DAÑADO', 'DANADO', 'NO SIRVE', 'MAL ESTADO', 'N/A', 'NA', 'SIN OBSERVACIONES', 'VARIOS']);
const LONGITUD_MINIMA_JUSTIFICACION = 20;

function exigirJustificacionIndividual(texto: string): string {
  const limpio = texto.trim().replace(/\s+/g, ' ');
  if (limpio.length < LONGITUD_MINIMA_JUSTIFICACION || JUSTIFICACIONES_GENERICAS.has(limpio.toUpperCase())) {
    throw new ErrorReglaNegocio(
      'JUSTIFICACION_GENERICA',
      'RN-09-06: la justificación es individual y específica de este bien. "Obsoleto" o "dañado" no sirven; describa la falla o el motivo concreto (por ejemplo: "falla en tarjeta de control, reparación no autorizada por costo").',
      { campo: 'justificacion' },
    );
  }
  return limpio;
}

export function registrarBaja(e: EntradaValidadaDe<'baja:registrar'>, ctx: ContextoIpc): BajaDto {
  const justificacion = exigirJustificacionIndividual(e.justificacion);
  const estado = bajaRepo.estadoDelBien(ctx.sqlite, e.bienId);
  if (estado === null) throw new ErrorValidacion('BIEN_INEXISTENTE', 'El bien no existe.', { campo: 'bienId' });
  if (estado === 'DADO_DE_BAJA') throw new ErrorReglaNegocio('BIEN_YA_DADO_DE_BAJA', 'El bien ya tiene una baja registrada.', { campo: 'bienId' });
  const hoy = ctx.ahoraIso().slice(0, 10);
  if (e.fecha > hoy) throw new ErrorReglaNegocio('FECHA_FUTURA', `La fecha de la baja no puede ser futura (hoy es ${hoy}).`, { campo: 'fecha' });

  const ahora = ctx.ahoraIso();
  const id = nuevoId();
  bajaRepo.insertar(ctx.sqlite, { id, bienId: e.bienId, fecha: e.fecha, causal: e.causal, justificacion, referencia: e.referencia?.trim() || null, creadoEn: ahora });
  bajaRepo.cambiarEstadoBien(ctx.sqlite, e.bienId, 'DADO_DE_BAJA', ahora);
  ctx.bitacora.registrar({
    entidadAfectada: 'baja',
    registroId: id,
    accion: 'CREAR',
    campo: 'causal_baja',
    valorNuevo: `${e.causal} · ${e.fecha}${e.referencia ? ` · ${e.referencia}` : ''}`,
    justificacion,
  });
  const creada = bajaRepo.porId(ctx.sqlite, id);
  if (creada === null) throw new Error(`La baja ${id} no quedó escrita`);
  return aDto(creada);
}

/** Una baja registrada por error no se borra: se anula, con motivo, y el bien vuelve a ACTIVO. */
export function anularBaja(e: EntradaValidadaDe<'baja:anular'>, ctx: ContextoIpc): BajaDto {
  const actual = bajaRepo.porId(ctx.sqlite, e.id);
  if (actual === null) throw new ErrorValidacion('BAJA_INEXISTENTE', 'La baja no existe.', { campo: 'id' });
  if (actual.anulada_en !== null) throw new ErrorReglaNegocio('BAJA_YA_ANULADA', 'Esa baja ya estaba anulada.', { campo: 'id' });

  const ahora = ctx.ahoraIso();
  const motivo = e.motivo.trim();
  bajaRepo.anular(ctx.sqlite, e.id, motivo, ahora);
  bajaRepo.cambiarEstadoBien(ctx.sqlite, actual.bien_id, 'ACTIVO', ahora);
  ctx.bitacora.registrar({
    entidadAfectada: 'baja',
    registroId: e.id,
    accion: 'ACTUALIZAR',
    campo: 'anulada_en',
    valorAnterior: null,
    valorNuevo: ahora,
    justificacion: motivo,
  });
  const anulada = bajaRepo.porId(ctx.sqlite, e.id);
  if (anulada === null) throw new Error(`La baja ${e.id} desapareció`);
  return aDto(anulada);
}
