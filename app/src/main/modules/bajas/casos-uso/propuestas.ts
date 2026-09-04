/**
 * Paso 09 — la bandeja de candidatos y las propuestas de baja (`T-F-01`, `T-F-02`).
 *
 * La app **registra estados; no ejecuta bajas** (RN-09-04). Aquí se propone, se
 * corrige y se mueve la propuesta por la máquina de `ANEXO_B` §6.3; la ejecución
 * exige el acta del Comité y la bloquea un trigger (INT-07), no este código.
 */
import type { ContextoIpc } from '../../../ipc/registroIpc';
import type { EntradaValidadaDe } from '../../../../compartido/ipc/contrato';
import type { CandidatoBajaDto, EfectoContableDto, PropuestaBajaDto, ResumenBajasDto } from '../../../../compartido/dtos/bajas';
import type { Centavos, FechaIso, MarcaTiempo, Uuid } from '../../../../compartido/tipos/basicos';
import { comoCentavos, comoFechaIso, comoX10k } from '../../../../compartido/tipos/basicos';
import type { CausalBaja, DestinoFinal, EstadoActual, EstadoOperativo, Semaforo } from '../../../../compartido/enums/catalogos';
import { ESTADO_PROPUESTA_BAJA, type EstadoPropuestaBaja } from '../../../../compartido/enums/estados';
import { ErrorReglaNegocio, ErrorValidacion } from '../../../../compartido/errores';
import { EsquemaParametrosCalculo } from '../../../../compartido/parametros/parametrosCalculo';
import { aX10k, desdeX10k } from '../../../../compartido/motor/dinero';
import { esCandidatoBaja } from '../../../../compartido/motor/candidatoBaja';
import { calcularEfectoContableBaja, evaluarReparacion } from '../../../../compartido/motor/baja';
import { nuevoId } from '../../../infraestructura/db/identificadores';
import { firmanteRepo } from '../../configuracion';
import { bajaRepo, type FilaCandidato, type FilaPropuesta } from '../repositorio/baja.repo';

const X10K = 10_000;

function parametros(ctx: ContextoIpc, ejercicioId: string) {
  const fila = ctx.sqlite.prepare('SELECT parametros_congelados_json AS j FROM ejercicio WHERE id = ?').get(ejercicioId) as { j: string } | undefined;
  if (fila === undefined) throw new ErrorValidacion('EJERCICIO_INEXISTENTE', 'El ejercicio no existe.', { campo: 'ejercicioId' });
  return EsquemaParametrosCalculo.parse(JSON.parse(fila.j));
}

/**
 * La causal que la app propone al abrir el formulario. Es una **sugerencia**: la
 * fija el especialista, que es quien firma. Un bien inservible se da de baja por
 * inservible aunque su índice sea bajo, y al revés.
 */
function causalSugerida(f: FilaCandidato): CausalBaja {
  if (f.estado_actual === 'INSERVIBLE') return 'INSERVIBLE';
  const indice = f.indice_obsolescencia_x10k;
  if (f.obsolescencia_funcional === 1 || (indice !== null && indice >= X10K)) return 'OBSOLESCENCIA';
  if (f.estado_actual === 'MALO') return 'INSERVIBLE';
  return 'DESUSO';
}

export function listarCandidatos(e: EntradaValidadaDe<'baja:candidatos'>, ctx: ContextoIpc): CandidatoBajaDto[] {
  const p = parametros(ctx, e.ejercicioId);
  return bajaRepo.candidatos(ctx.sqlite, e.ejercicioId, e.incluirYaPropuestos).map((f) => {
    // Los motivos no se persisten: se vuelven a derivar del mismo motor que los
    // produjo, para que la pantalla y la resolución digan exactamente lo mismo.
    const { motivos } = esCandidatoBaja({
      indiceObsolescencia: f.indice_obsolescencia_x10k === null ? null : desdeX10k(comoX10k(f.indice_obsolescencia_x10k)),
      estadoActual: f.estado_actual as EstadoActual,
      estadoOperativo: f.estado_operativo === null ? null : (f.estado_operativo as EstadoOperativo),
      obsolescenciaFuncional: f.obsolescencia_funcional === 1,
      tieneMantenimientoCorrectivoFallido: f.correctivo_fallido === 1,
      umbralAmarillo: p.umbral_semaforo_amarillo,
    });
    return {
      bienId: f.bien_id as Uuid,
      codigoInstitucional: f.codigo_institucional,
      descripcionFuncional: f.descripcion_funcional,
      claseCodigo: f.clase_codigo,
      claseNombre: f.clase_nombre,
      servicioCodigo: f.servicio_codigo,
      estadoActual: f.estado_actual as EstadoActual,
      estadoRegistro: f.estado_registro,
      indiceObsolescencia: f.indice_obsolescencia_x10k === null ? null : f.indice_obsolescencia_x10k / X10K,
      semaforo: f.semaforo === null ? null : (f.semaforo as Semaforo),
      obsolescenciaFuncional: f.obsolescencia_funcional === 1,
      motivos,
      causalSugerida: causalSugerida(f),
      valorNetoLibros: f.valor_neto_libros_cent === null ? null : (f.valor_neto_libros_cent as Centavos),
      saldoFinalAjustado: f.saldo_final_ajustado_cent === null ? null : (f.saldo_final_ajustado_cent as Centavos),
      totalmenteDepreciado: f.totalmente_depreciado === 1,
      propuestaId: f.propuesta_id === null ? null : (f.propuesta_id as Uuid),
      estadoPropuesta: f.estado_propuesta === null ? null : (f.estado_propuesta as EstadoPropuestaBaja),
    };
  });
}

function efectoContable(f: FilaPropuesta): EfectoContableDto {
  return calcularEfectoContableBaja({
    valorBruto: comoCentavos(f.saldo_final_ajustado_cent ?? 0),
    depreciacionAsociada: comoCentavos(f.depreciacion_acumulada_cent ?? 0),
    deterioroAsociado: comoCentavos(f.deterioro_cent ?? 0),
    valorSalvamento: comoCentavos(f.valor_salvamento_cent ?? 0),
  });
}

function aDto(f: FilaPropuesta, umbralPct: number): PropuestaBajaDto {
  const economia = evaluarReparacion({
    costoReparacionEstimado: f.costo_reparacion_estimado_cent === null ? null : (f.costo_reparacion_estimado_cent as Centavos),
    valorReposicion: f.valor_reposicion_cent === null ? null : (f.valor_reposicion_cent as Centavos),
    umbralPct,
  });
  return {
    id: f.id as Uuid,
    ejercicioId: f.ejercicio_id as Uuid,
    bienId: f.bien_id as Uuid,
    codigoInstitucional: f.codigo_institucional,
    descripcionFuncional: f.descripcion_funcional,
    claseCodigo: f.clase_codigo,
    servicioCodigo: f.servicio_codigo,
    causal: f.causal as CausalBaja,
    justificacionTecnica: f.justificacion_tecnica,
    costoReparacionEstimado: f.costo_reparacion_estimado_cent === null ? null : (f.costo_reparacion_estimado_cent as Centavos),
    valorReposicion: f.valor_reposicion_cent === null ? null : (f.valor_reposicion_cent as Centavos),
    relacionReparacionReposicion: f.relacion_reparacion_reposicion_x10k === null ? null : f.relacion_reparacion_reposicion_x10k / X10K,
    procedeBajaPorEconomia: economia.estado === 'CALCULADO' ? economia.valor.procedeBaja : null,
    recomendacionEconomica: economia.estado === 'CALCULADO' ? economia.valor.recomendacion : economia.motivo,
    valorSalvamento: f.valor_salvamento_cent === null ? null : (f.valor_salvamento_cent as Centavos),
    destinoFinalPropuesto: f.destino_final_propuesto === null ? null : (f.destino_final_propuesto as DestinoFinal),
    especialistaId: f.especialista_id as Uuid,
    especialistaNombre: f.especialista_nombre,
    fechaPropuesta: comoFechaIso(f.fecha_propuesta),
    estadoAprobacion: f.estado_aprobacion as EstadoPropuestaBaja,
    observacionComite: f.observacion_comite,
    efectoContable: efectoContable(f),
    creadoEn: f.creado_en as MarcaTiempo,
    actualizadoEn: f.actualizado_en as MarcaTiempo,
  };
}

export function listarPropuestas(e: EntradaValidadaDe<'baja:listar'>, ctx: ContextoIpc): PropuestaBajaDto[] {
  const p = parametros(ctx, e.ejercicioId);
  return bajaRepo.listar(ctx.sqlite, e.ejercicioId, e.estado).map((f) => aDto(f, p.umbral_reparacion_baja_pct));
}

function exigirPropuesta(ctx: ContextoIpc, id: string): FilaPropuesta {
  const f = bajaRepo.porId(ctx.sqlite, id);
  if (f === null) throw new ErrorValidacion('PROPUESTA_INEXISTENTE', 'La propuesta de baja no existe.', { campo: 'id' });
  return f;
}

/** Justificaciones que no dicen nada: RN-09-06 exige el motivo específico del bien. */
const JUSTIFICACIONES_GENERICAS = new Set(['BAJA', 'DAR DE BAJA', 'OBSOLETO', 'OBSOLETA', 'INSERVIBLE', 'DAÑADO', 'DANADO', 'NO SIRVE', 'MAL ESTADO', 'N/A', 'NA', 'SIN OBSERVACIONES', 'VARIOS']);
const LONGITUD_MINIMA_JUSTIFICACION = 20;

function exigirJustificacionIndividual(texto: string): string {
  const limpio = texto.trim().replace(/\s+/g, ' ');
  if (limpio.length < LONGITUD_MINIMA_JUSTIFICACION || JUSTIFICACIONES_GENERICAS.has(limpio.toUpperCase())) {
    throw new ErrorReglaNegocio(
      'JUSTIFICACION_GENERICA',
      'RN-09-06: la justificación técnica es individual y específica de este bien. "Obsoleto" o "dañado" no sirven; describa la falla o el motivo concreto (por ejemplo: "falla en tarjeta de control, reparación no autorizada por costo").',
      { campo: 'justificacionTecnica' },
    );
  }
  return limpio;
}

export function proponerBaja(e: EntradaValidadaDe<'baja:proponer'>, ctx: ContextoIpc): PropuestaBajaDto {
  const p = parametros(ctx, e.ejercicioId);
  const justificacion = exigirJustificacionIndividual(e.justificacionTecnica);

  const yaPropuesto = bajaRepo.propuestaVivaDelBien(ctx.sqlite, e.ejercicioId, e.bienId);
  if (yaPropuesto !== null) {
    throw new ErrorReglaNegocio('BIEN_YA_PROPUESTO', `El bien ya tiene una propuesta de baja en estado ${yaPropuesto.estado_aprobacion}.`, { campo: 'bienId' });
  }

  const estadoBien = bajaRepo.estadoDelBien(ctx.sqlite, e.bienId);
  if (estadoBien === null) throw new ErrorValidacion('BIEN_INEXISTENTE', 'El bien no existe.', { campo: 'bienId' });
  if (estadoBien !== 'ACTIVO') {
    throw new ErrorReglaNegocio(
      'BIEN_NO_ACTIVO',
      `Solo se propone la baja de un bien activo; este está en ${estadoBien}. Cierre el inventario para pasar los bienes validados a activos.`,
      { campo: 'bienId' },
    );
  }

  // RN-09-03: la relación se guarda con el resto de la propuesta para que la
  // resolución cite el mismo número que vio el Comité, aunque el umbral cambie.
  const economia = evaluarReparacion({
    costoReparacionEstimado: e.costoReparacionEstimado === null || e.costoReparacionEstimado === undefined ? null : (e.costoReparacionEstimado as Centavos),
    valorReposicion: e.valorReposicion === null || e.valorReposicion === undefined ? null : (e.valorReposicion as Centavos),
    umbralPct: p.umbral_reparacion_baja_pct,
  });

  const id = nuevoId();
  const ahora = ctx.ahoraIso();
  // ADR-027: el esquema exige atribuir la propuesta a alguien. Ese alguien es el
  // representante legal, que ya está en los datos de la entidad; al hospital no
  // se le pide elegir a nadie.
  const fila = ctx.sqlite.prepare('SELECT entidad_id FROM ejercicio WHERE id = ?').get(e.ejercicioId) as { entidad_id: string } | undefined;
  if (fila === undefined) throw new ErrorValidacion('EJERCICIO_INEXISTENTE', 'El ejercicio no existe.', { campo: 'ejercicioId' });
  const firmanteId = firmanteRepo.gerente(ctx.db, fila.entidad_id);
  if (firmanteId === null) {
    throw new ErrorReglaNegocio('ENTIDAD_SIN_GERENTE', 'La entidad no tiene registrado su Gerente. Complete los datos de la entidad antes de proponer bajas.', { campo: 'ejercicioId' });
  }
  bajaRepo.insertar(ctx.sqlite, {
    id,
    ejercicioId: e.ejercicioId,
    bienId: e.bienId,
    causal: e.causal,
    justificacionTecnica: justificacion,
    costoReparacionEstimado: e.costoReparacionEstimado ?? null,
    valorReposicion: e.valorReposicion ?? null,
    relacionReparacionReposicion: economia.estado === 'CALCULADO' ? aX10k(economia.valor.relacion) : null,
    valorSalvamento: e.valorSalvamento ?? null,
    destinoFinalPropuesto: e.destinoFinalPropuesto ?? null,
    especialistaId: firmanteId,
    fechaPropuesta: e.fechaPropuesta,
    creadoEn: ahora,
    actualizadoEn: ahora,
  });
  bajaRepo.transicionarBien(ctx.sqlite, e.bienId, 'PROPUESTO_BAJA', ahora);

  ctx.bitacora.registrar({
    entidadAfectada: 'propuesta_baja',
    registroId: id,
    accion: 'CREAR',
    campo: 'causal',
    valorNuevo: `${e.causal} · ${justificacion}`,
    justificacion,
  });
  return aDto(exigirPropuesta(ctx, id), p.umbral_reparacion_baja_pct);
}

const COLUMNA_DE: Readonly<Record<string, string>> = {
  causal: 'causal',
  justificacionTecnica: 'justificacion_tecnica',
  costoReparacionEstimado: 'costo_reparacion_estimado_cent',
  valorReposicion: 'valor_reposicion_cent',
  valorSalvamento: 'valor_salvamento_cent',
  destinoFinalPropuesto: 'destino_final_propuesto',
};

export function actualizarPropuesta(e: EntradaValidadaDe<'baja:actualizar'>, ctx: ContextoIpc): PropuestaBajaDto {
  const actual = exigirPropuesta(ctx, e.id);
  const p = parametros(ctx, actual.ejercicio_id);

  // Una propuesta que ya pasó por el Comité no se reescribe: se rechaza o se
  // ejecuta. Corregirla después dejaría el acta hablando de otra cosa.
  if (actual.estado_aprobacion !== 'PROPUESTO' && actual.estado_aprobacion !== 'EN_REVISION') {
    throw new ErrorReglaNegocio('PROPUESTA_NO_EDITABLE', `La propuesta está en ${actual.estado_aprobacion} y ya no se puede modificar.`);
  }

  const campos: Record<string, string | number | null> = {};
  for (const [clave, valor] of Object.entries(e.cambios)) {
    const columna = COLUMNA_DE[clave];
    if (columna === undefined || valor === undefined) continue;
    campos[columna] = clave === 'justificacionTecnica' ? exigirJustificacionIndividual(String(valor)) : (valor as string | number | null);
  }

  const costo = 'costo_reparacion_estimado_cent' in campos ? (campos['costo_reparacion_estimado_cent'] as number | null) : actual.costo_reparacion_estimado_cent;
  const reposicion = 'valor_reposicion_cent' in campos ? (campos['valor_reposicion_cent'] as number | null) : actual.valor_reposicion_cent;
  const economia = evaluarReparacion({
    costoReparacionEstimado: costo === null ? null : (costo as Centavos),
    valorReposicion: reposicion === null ? null : (reposicion as Centavos),
    umbralPct: p.umbral_reparacion_baja_pct,
  });
  campos['relacion_reparacion_reposicion_x10k'] = economia.estado === 'CALCULADO' ? aX10k(economia.valor.relacion) : null;

  const ahora = ctx.ahoraIso();
  bajaRepo.actualizar(ctx.sqlite, e.id, campos, ahora);
  for (const [columna, valor] of Object.entries(campos)) {
    ctx.bitacora.registrar({
      entidadAfectada: 'propuesta_baja',
      registroId: e.id,
      accion: 'ACTUALIZAR',
      campo: columna,
      valorNuevo: valor === null ? null : String(valor),
      justificacion: e.justificacion ?? null,
    });
  }
  return aDto(exigirPropuesta(ctx, e.id), p.umbral_reparacion_baja_pct);
}

export function cambiarEstadoPropuesta(e: EntradaValidadaDe<'baja:cambiarEstado'>, ctx: ContextoIpc): PropuestaBajaDto {
  const actual = exigirPropuesta(ctx, e.id);
  const p = parametros(ctx, actual.ejercicio_id);
  const ahora = ctx.ahoraIso();

  if (e.nuevoEstado === 'RECHAZADO' && (e.observacionComite === null || e.observacionComite.trim() === '')) {
    throw new ErrorReglaNegocio('RECHAZO_SIN_OBSERVACION', 'RN-09-04: un rechazo del Comité tiene que decir por qué; el bien vuelve a activo con esa observación.', { campo: 'observacionComite' });
  }

  // La transición la valida el trigger de ANEXO_B §6.3; aquí solo se traduce el
  // error a un mensaje que diga qué se esperaba.
  const permitidas = TRANSICIONES[actual.estado_aprobacion as EstadoPropuestaBaja] ?? [];
  if (!permitidas.includes(e.nuevoEstado)) {
    throw new ErrorReglaNegocio(
      'TRANSICION_NO_PERMITIDA',
      `Desde ${ESTADO_PROPUESTA_BAJA.etiqueta(actual.estado_aprobacion as EstadoPropuestaBaja)} solo se puede pasar a ${permitidas.length === 0 ? 'ningún otro estado' : permitidas.map((x) => ESTADO_PROPUESTA_BAJA.etiqueta(x)).join(' o ')}.`,
      { campo: 'nuevoEstado' },
    );
  }

  bajaRepo.cambiarEstado(ctx.sqlite, e.id, e.nuevoEstado, e.observacionComite ?? null, ahora);
  // RN-09-04: el bien rechazado vuelve a ACTIVO con la observación del Comité.
  if (e.nuevoEstado === 'RECHAZADO') bajaRepo.transicionarBien(ctx.sqlite, actual.bien_id, 'ACTIVO', ahora);

  ctx.bitacora.registrar({
    entidadAfectada: 'propuesta_baja',
    registroId: e.id,
    accion: e.nuevoEstado === 'RECHAZADO' ? 'RECHAZAR' : 'APROBAR',
    campo: 'estado_aprobacion',
    valorAnterior: actual.estado_aprobacion,
    valorNuevo: e.nuevoEstado,
    justificacion: e.observacionComite ?? null,
  });
  return aDto(exigirPropuesta(ctx, e.id), p.umbral_reparacion_baja_pct);
}

/** ANEXO_B §6.3, la misma máquina que aplican los triggers. */
const TRANSICIONES: Readonly<Record<EstadoPropuestaBaja, readonly EstadoPropuestaBaja[]>> = {
  PROPUESTO: ['EN_REVISION'],
  EN_REVISION: ['APROBADO_COMITE', 'RECHAZADO'],
  APROBADO_COMITE: ['RESOLUCION_EMITIDA'],
  RESOLUCION_EMITIDA: ['EJECUTADO'],
  EJECUTADO: ['DISPOSICION_DOCUMENTADA'],
  DISPOSICION_DOCUMENTADA: [],
  RECHAZADO: [],
};

export function resumenBajas(e: EntradaValidadaDe<'baja:resumen'>, ctx: ContextoIpc): ResumenBajasDto {
  const p = parametros(ctx, e.ejercicioId);
  const propuestas = bajaRepo.listar(ctx.sqlite, e.ejercicioId).map((f) => aDto(f, p.umbral_reparacion_baja_pct));
  const porEstado = Object.fromEntries(ESTADO_PROPUESTA_BAJA.valores.map((s) => [s, 0])) as Record<EstadoPropuestaBaja, number>;
  for (const x of propuestas) porEstado[x.estadoAprobacion] += 1;

  // Los rechazos no suman: el bien volvió al inventario activo.
  const vivas = propuestas.filter((x) => x.estadoAprobacion !== 'RECHAZADO');
  const suma = (f: (x: PropuestaBajaDto) => number): Centavos => comoCentavos(vivas.reduce((n, x) => n + f(x), 0));

  return {
    ejercicioId: e.ejercicioId as Uuid,
    candidatosSinProponer: bajaRepo.contarCandidatosSinProponer(ctx.sqlite, e.ejercicioId),
    porEstado,
    totalPropuestas: propuestas.length,
    valorBrutoTotal: suma((x) => x.efectoContable.valorBruto),
    depreciacionTotal: suma((x) => x.efectoContable.depreciacionAsociada),
    valorNetoTotal: suma((x) => x.efectoContable.valorNeto),
    perdidaTotal: suma((x) => x.efectoContable.perdidaReconocida),
    valorRecuperadoTotal: suma((x) => x.efectoContable.valorRecuperado),
  };
}

/**
 * Cierre del inventario: los bienes con datos completos pasan a formar parte del
 * inventario activo. Es requisito para proponer una baja, y es una decisión del
 * usuario —no un efecto colateral del cálculo—, así que tiene su propio canal.
 */
export function activarValidados(e: EntradaValidadaDe<'bien:activarValidados'>, ctx: ContextoIpc): { activados: number } {
  const ahora = ctx.ahoraIso();
  const activados = bajaRepo.activarValidados(ctx.sqlite, e.ejercicioId, ahora);
  if (activados > 0) {
    ctx.bitacora.registrar({
      entidadAfectada: 'ejercicio',
      registroId: e.ejercicioId,
      accion: 'ACTUALIZAR',
      campo: 'estado_registro',
      valorAnterior: 'VALIDADO',
      valorNuevo: `ACTIVO (${activados} bienes)`,
    });
  }
  return { activados };
}

/** Fecha de hoy en el huso del equipo, para proponer sin teclear (solo UI). */
export function hoyIso(ctx: ContextoIpc): FechaIso {
  return comoFechaIso(ctx.ahoraIso().slice(0, 10));
}
