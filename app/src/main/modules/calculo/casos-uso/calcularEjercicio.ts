/**
 * ANEXO_C §10 — orden de ejecución del motor, pasos 2.1 a 2.4.
 *
 * Este caso de uso NO contiene aritmética: lee la base, llama al motor puro y
 * persiste lo que devuelve. Toda fórmula vive en `compartido/motor`, que es lo
 * único cubierto por los casos de verificación de `/especificacion/teoria` (`RG-01`).
 *
 * El motor lee SIEMPRE los parámetros **congelados** del ejercicio (RN-01-01),
 * nunca el catálogo vigente: si alguien cambia el valor residual hoy, un ejercicio
 * abierto en marzo debe seguir calculando con lo que se pactó en marzo.
 */
import { createHash } from 'node:crypto';
import type { ContextoIpc } from '../../../ipc/registroIpc';
import type { EntradaValidadaDe } from '../../../../compartido/ipc/contrato';
import type { ExclusionCalculoDto, ResultadoEjecucionCalculoDto } from '../../../../compartido/dtos/calculo';
import type { Uuid, Centavos, FechaIso } from '../../../../compartido/tipos/basicos';
import { comoCentavos, comoFechaIso, comoX10k } from '../../../../compartido/tipos/basicos';
import type { EstadoActual, EstadoOperativo } from '../../../../compartido/enums/catalogos';
import { ErrorReglaNegocio, ErrorValidacion } from '../../../../compartido/errores';
import { EsquemaParametrosCalculo, type ParametrosCalculo } from '../../../../compartido/parametros/parametrosCalculo';
import { aX10k, desdeX10k } from '../../../../compartido/motor/dinero';
import { calcularObsolescencia } from '../../../../compartido/motor/obsolescencia';
import { calcularDepreciacion } from '../../../../compartido/motor/depreciacion';
import { esCandidatoBaja } from '../../../../compartido/motor/candidatoBaja';
import { nuevoId } from '../../../infraestructura/db/identificadores';
import { calculoRepo, type EntradaBien, type FilaDepreciacionParaEscribir, type FilaObsolescenciaParaEscribir } from '../repositorio/calculo.repo';
import { resumenCalculo } from './consultarCalculo';

interface DatosEjercicio {
  readonly id: string;
  readonly entidad_id: string;
  readonly fecha_corte: string;
  readonly estado: string;
  readonly parametros_congelados_json: string;
}

function exigirEjercicio(ctx: ContextoIpc, entidadId: string, ejercicioId: string): DatosEjercicio {
  const e = ctx.sqlite.prepare('SELECT id, entidad_id, fecha_corte, estado, parametros_congelados_json FROM ejercicio WHERE id = ?').get(ejercicioId) as
    | DatosEjercicio
    | undefined;
  if (e === undefined || e.entidad_id !== entidadId) {
    throw new ErrorValidacion('EJERCICIO_INEXISTENTE', 'El ejercicio no existe o no pertenece a la entidad.', { campo: 'ejercicioId' });
  }
  return e;
}

function parametrosCongelados(e: DatosEjercicio): ParametrosCalculo {
  try {
    return EsquemaParametrosCalculo.parse(JSON.parse(e.parametros_congelados_json));
  } catch {
    throw new ErrorReglaNegocio('PARAMETROS_ILEGIBLES', 'Los parámetros congelados del ejercicio no se pueden leer; vuelva a crearlo desde el paso 01.');
  }
}

/** Huella de lo que entró al cálculo: si cambia, el resultado quedó desfasado (plan 2.6 §9). */
function huella(partes: readonly (string | number | boolean | null)[]): string {
  return createHash('sha256').update(partes.map((p) => String(p ?? '∅')).join('|')).digest('hex').slice(0, 32);
}

function huellaEntrada(b: EntradaBien): string {
  return huella([
    b.fecha_adquisicion,
    b.fecha_puesta_servicio,
    b.costo_adquisicion_cent,
    b.adiciones_mejoras_cent,
    b.vida_util_contable_meses,
    b.vida_util_tecnica_anios_x10k,
    b.vida_util_tecnica_override_x10k,
    b.es_depreciable,
    b.estado_actual,
    b.condicion_tenencia,
    b.deterioro_cent,
  ]);
}

const fecha = (v: string | null): FechaIso | null => (v === null ? null : comoFechaIso(v));

export function calcularEjercicio(e: EntradaValidadaDe<'calculo:ejecutar'>, ctx: ContextoIpc): ResultadoEjecucionCalculoDto {
  const t0 = performance.now();
  const ejercicio = exigirEjercicio(ctx, e.entidadId, e.ejercicioId);
  const p = parametrosCongelados(ejercicio);

  // CT-02 / VAL-01-07: calcular con un método que el contador no ha firmado
  // produce cifras que después no cuadran con contabilidad y hay que rehacer.
  if (!p.metodo_conteo_meses_confirmado) {
    throw new ErrorReglaNegocio(
      'METODO_CONTEO_SIN_CONFIRMAR',
      'El método de conteo de meses todavía no se ha confirmado por acta con el contador (VAL-01-07). Confírmelo en el paso 01 antes de calcular: cambiarlo después obliga a recalcular el ejercicio completo.',
    );
  }

  const fechaCorte = comoFechaIso(ejercicio.fecha_corte);
  const parametrosHash = huella([p.metodo_conteo_meses, p.deprecia_mes_adquisicion, p.usa_puesta_en_servicio, p.valor_residual_pct, p.decimales_calculo, p.umbral_semaforo_verde, p.umbral_semaforo_amarillo, p.umbral_semaforo_naranja]);
  const calculadoEn = ctx.ahoraIso();
  const funcionalPrevia = calculoRepo.obsolescenciaFuncionalPrevia(ctx.sqlite, e.ejercicioId);

  const filasObs: FilaObsolescenciaParaEscribir[] = [];
  const filasDep: FilaDepreciacionParaEscribir[] = [];
  const exclusiones: ExclusionCalculoDto[] = [];

  for (const b of calculoRepo.entradas(ctx.sqlite, e.ejercicioId)) {
    const entradaHash = huellaEntrada(b);
    const funcional = funcionalPrevia.get(b.bien_id) ?? false;

    // ── 2.2 Obsolescencia (ANEXO_C §2) ──
    const obs = calcularObsolescencia({
      fechaAdquisicion: fecha(b.fecha_adquisicion),
      fechaCorte,
      vidaUtilTecnicaAniosClase: b.vida_util_tecnica_anios_x10k === null ? null : desdeX10k(comoX10k(b.vida_util_tecnica_anios_x10k)),
      vidaUtilTecnicaAniosOverride: b.vida_util_tecnica_override_x10k === null ? null : desdeX10k(comoX10k(b.vida_util_tecnica_override_x10k)),
      umbrales: { verde: p.umbral_semaforo_verde, amarillo: p.umbral_semaforo_amarillo, naranja: p.umbral_semaforo_naranja },
    });

    if (obs.estado === 'CALCULADO') {
      const candidato = esCandidatoBaja({
        indiceObsolescencia: obs.valor.indiceObsolescencia,
        estadoActual: b.estado_actual as EstadoActual,
        estadoOperativo: b.estado_operativo === null ? null : (b.estado_operativo as EstadoOperativo),
        obsolescenciaFuncional: funcional,
        tieneMantenimientoCorrectivoFallido: b.correctivo_fallido === 1,
        umbralAmarillo: p.umbral_semaforo_amarillo,
      });
      filasObs.push({
        id: nuevoId(),
        ejercicioId: e.ejercicioId,
        bienId: b.bien_id,
        fechaCorte,
        vidaUtilTecnicaAplicada: aX10k(obs.valor.vidaUtilAplicadaAnios),
        edadActualAnios: aX10k(obs.valor.edadActualAnios),
        indiceObsolescencia: aX10k(obs.valor.indiceObsolescencia),
        aniosRestantes: aX10k(obs.valor.aniosRestantes),
        fechaFinVidaUtil: obs.valor.fechaFinVidaUtil,
        semaforo: obs.valor.semaforo,
        obsolescenciaFuncional: funcional ? 1 : 0,
        candidatoBaja: candidato.esCandidato ? 1 : 0,
        entradaHash,
        parametrosHash,
        calculadoEn,
      });
    } else {
      exclusiones.push({ bienId: b.bien_id as Uuid, codigoInstitucional: b.codigo_institucional, ambito: 'OBSOLESCENCIA', estado: obs.estado, motivo: obs.motivo });
    }

    // ── 2.3 Depreciación (ANEXO_C §3) ──
    // RN-02-04: lo que no es propio se controla físicamente pero no entra al
    // patrimonio, así que no se deprecia.
    if (b.condicion_tenencia !== 'PROPIO') {
      exclusiones.push({
        bienId: b.bien_id as Uuid,
        codigoInstitucional: b.codigo_institucional,
        ambito: 'DEPRECIACION',
        estado: 'NO_APLICA',
        motivo: `RN-02-04: el bien es ${b.condicion_tenencia.toLowerCase()} y no entra al patrimonio de la entidad.`,
      });
      continue;
    }

    const deterioroAcumulado = comoCentavos(b.deterioro_cent ?? 0);
    const dep = calcularDepreciacion({
      esDepreciable: b.es_depreciable === 1,
      costoAdquisicion: b.costo_adquisicion_cent === null ? null : (b.costo_adquisicion_cent as Centavos),
      adicionesMejoras: comoCentavos(b.adiciones_mejoras_cent ?? 0),
      vidaUtilContableMeses: b.vida_util_contable_meses,
      fechaAdquisicion: fecha(b.fecha_adquisicion),
      fechaPuestaServicio: fecha(b.fecha_puesta_servicio),
      fechaCorte,
      deterioroAcumulado,
      parametros: {
        metodoConteoMeses: p.metodo_conteo_meses,
        depreciaMesAdquisicion: p.deprecia_mes_adquisicion,
        usaPuestaEnServicio: p.usa_puesta_en_servicio,
        valorResidualPct: p.valor_residual_pct,
        decimalesCalculo: p.decimales_calculo,
      },
    });

    if (dep.estado === 'CALCULADO') {
      filasDep.push({
        id: nuevoId(),
        ejercicioId: e.ejercicioId,
        bienId: b.bien_id,
        fechaCorte,
        valorAdquisicion: b.costo_adquisicion_cent ?? 0,
        adicionesMejoras: b.adiciones_mejoras_cent ?? 0,
        saldoFinalAjustado: dep.valor.saldoFinalAjustado,
        valorResidual: dep.valor.valorResidual,
        baseDepreciable: dep.valor.baseDepreciable,
        fechaInicioDepreciacion: dep.valor.fechaInicioDepreciacion,
        vidaUtilMeses: b.vida_util_contable_meses ?? 0,
        depreciacionMensual: aX10k(dep.valor.depreciacionMensual),
        mesesTranscurridos: aX10k(dep.valor.mesesTranscurridos),
        metodoConteoAplicado: dep.valor.metodoConteoAplicado,
        depreciacionAcumulada: dep.valor.depreciacionAcumulada,
        deterioro: deterioroAcumulado,
        saldoPorDepreciar: dep.valor.saldoPorDepreciar,
        valorNetoLibros: dep.valor.valorNetoLibros,
        totalmenteDepreciado: dep.valor.totalmenteDepreciado ? 1 : 0,
        entradaHash,
        parametrosHash,
        calculadoEn,
      });
    } else {
      exclusiones.push({ bienId: b.bien_id as Uuid, codigoInstitucional: b.codigo_institucional, ambito: 'DEPRECIACION', estado: dep.estado, motivo: dep.motivo });
    }
  }

  calculoRepo.guardarObsolescencia(ctx.sqlite, filasObs);
  calculoRepo.guardarDepreciacion(ctx.sqlite, filasDep);
  // Lo que no se recalculó en esta pasada ya no tiene respaldo: se retira.
  calculoRepo.borrarSobrantes(ctx.sqlite, e.ejercicioId, 'calculo_obsolescencia', filasObs.map((f) => f.bienId));
  calculoRepo.borrarSobrantes(ctx.sqlite, e.ejercicioId, 'calculo_depreciacion', filasDep.map((f) => f.bienId));

  ctx.bitacora.registrar({
    entidadAfectada: 'ejercicio',
    registroId: e.ejercicioId,
    accion: 'CALCULAR',
    campo: 'motor',
    valorNuevo: `corte ${ejercicio.fecha_corte}, método ${p.metodo_conteo_meses}: ${filasObs.length} obsolescencias, ${filasDep.length} depreciaciones, ${exclusiones.length} exclusiones`,
  });

  return {
    resumen: resumenCalculo({ ejercicioId: e.ejercicioId }, ctx),
    exclusiones,
    milisegundos: Math.round(performance.now() - t0),
  };
}
