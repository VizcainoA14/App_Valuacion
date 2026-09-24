/**
 * ANEXO_C §10 — orden de ejecución del motor, pasos 2.1 a 2.4, sobre un corte.
 *
 * Este caso de uso NO contiene aritmética: lee la base, llama al motor puro y
 * persiste lo que devuelve. Toda fórmula vive en `compartido/motor`, que es lo
 * único cubierto por los casos de verificación de `/especificacion/teoria` (`RG-01`).
 *
 * ADR-029: cada proceso tiene su fecha de corte y un cálculo. Calcular otra vez
 * —porque se corrigió un dato— reemplaza el anterior. El corte guarda una copia
 * de los parámetros (RN-01-01) y todo lo que calculó, y lo que no pudo calcular
 * con su motivo. Con el proceso finalizado ya no se recalcula: lo impiden los
 * disparadores.
 */
import type { ContextoIpc } from '../../../ipc/registroIpc';
import type { EntradaValidadaDe } from '../../../../compartido/ipc/contrato';
import type { ExclusionCalculoDto, ResultadoEjecucionCalculoDto } from '../../../../compartido/dtos/calculo';
import type { Uuid, Centavos, FechaIso } from '../../../../compartido/tipos/basicos';
import { comoCentavos, comoFechaIso, comoX10k } from '../../../../compartido/tipos/basicos';
import type { EstadoActual, EstadoOperativo } from '../../../../compartido/enums/catalogos';
import { ErrorReglaNegocio, ErrorValidacion } from '../../../../compartido/errores';
import { parametrosDesdeFilas, type ParametrosCalculo } from '../../../../compartido/parametros/parametrosCalculo';
import { aX10k, desdeX10k } from '../../../../compartido/motor/dinero';
import { calcularObsolescencia } from '../../../../compartido/motor/obsolescencia';
import { calcularDepreciacion } from '../../../../compartido/motor/depreciacion';
import { esCandidatoBaja } from '../../../../compartido/motor/candidatoBaja';
import { nuevoId } from '../../../infraestructura/db/identificadores';
import {
  calculoRepo,
  type FilaDepreciacionParaEscribir,
  type FilaExclusionParaEscribir,
  type FilaObsolescenciaParaEscribir,
} from '../repositorio/calculo.repo';
import { corteDto, resumenCalculo } from './consultarCalculo';

/** Los parámetros vigentes de la entidad; el corte se queda con una copia. */
export function parametrosVigentes(ctx: ContextoIpc, procesoId: string): ParametrosCalculo {
  const filas = ctx.sqlite.prepare('SELECT clave, valor FROM parametro_calculo WHERE proceso_id = ?').all(procesoId) as { clave: string; valor: string }[];
  return parametrosDesdeFilas(filas);
}

const fecha = (v: string | null): FechaIso | null => (v === null ? null : comoFechaIso(v));

export function calcularCorte(e: EntradaValidadaDe<'calculo:ejecutar'>, ctx: ContextoIpc): ResultadoEjecucionCalculoDto {
  const t0 = performance.now();
  const proceso = ctx.sqlite.prepare('SELECT id, fecha_corte, estado, nombre FROM proceso WHERE id = ?').get(e.procesoId) as
    | { id: string; fecha_corte: string; estado: string; nombre: string }
    | undefined;
  if (proceso === undefined) throw new ErrorValidacion('PROCESO_INEXISTENTE', 'El proceso no existe.', { campo: 'procesoId' });
  if (proceso.estado === 'FINALIZADO') {
    throw new ErrorReglaNegocio('PROCESO_FINALIZADO', `El proceso «${proceso.nombre}» está finalizado: su cálculo ya no cambia.`);
  }

  const hoy = ctx.ahoraIso().slice(0, 10);
  if (proceso.fecha_corte > hoy) {
    throw new ErrorReglaNegocio('FECHA_CORTE_FUTURA', `La fecha de corte del proceso es futura (hoy es ${hoy}): no se deprecia lo que todavía no ha pasado. Cámbiela en Configurar.`, { campo: 'fechaCorte' });
  }

  const entradas = calculoRepo.entradas(ctx.sqlite, e.procesoId);
  if (entradas.length === 0) {
    throw new ErrorReglaNegocio('SIN_INVENTARIO', 'El proceso no tiene bienes para calcular. Importe primero un barrido (PL-03) y sus datos económicos (PL-05).');
  }

  const p = parametrosVigentes(ctx, e.procesoId);
  const fechaCorte = comoFechaIso(proceso.fecha_corte);
  const corteId = nuevoId();
  const calculadoEn = ctx.ahoraIso();

  const filasObs: FilaObsolescenciaParaEscribir[] = [];
  const filasDep: FilaDepreciacionParaEscribir[] = [];
  const exclusiones: ExclusionCalculoDto[] = [];
  const excluir = (b: { bien_id: string; codigo_institucional: string }, x: Omit<ExclusionCalculoDto, 'bienId' | 'codigoInstitucional'>): void => {
    exclusiones.push({ bienId: b.bien_id as Uuid, codigoInstitucional: b.codigo_institucional, ...x });
  };

  for (const b of entradas) {
    // Un bien comprado después de la fecha de corte no existía ese día: no es
    // un error de datos, simplemente no entra a este corte.
    if (b.fecha_adquisicion !== null && b.fecha_adquisicion > fechaCorte) {
      excluir(b, { ambito: 'GENERAL', estado: 'NO_APLICA', motivo: `Adquirido el ${b.fecha_adquisicion}, después de la fecha de corte: no existía en este corte.` });
      continue;
    }
    const funcional = b.obsolescencia_funcional === 1;

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
        corteId,
        bienId: b.bien_id,
        vidaUtilTecnicaAplicada: aX10k(obs.valor.vidaUtilAplicadaAnios),
        edadActualAnios: aX10k(obs.valor.edadActualAnios),
        indiceObsolescencia: aX10k(obs.valor.indiceObsolescencia),
        aniosRestantes: aX10k(obs.valor.aniosRestantes),
        fechaFinVidaUtil: obs.valor.fechaFinVidaUtil,
        semaforo: obs.valor.semaforo,
        obsolescenciaFuncional: funcional ? 1 : 0,
        candidatoBaja: candidato.esCandidato ? 1 : 0,
        motivosBaja: candidato.esCandidato ? JSON.stringify(candidato.motivos) : null,
      });
    } else {
      excluir(b, { ambito: 'OBSOLESCENCIA', estado: obs.estado, motivo: obs.motivo });
    }

    // ── 2.3 Depreciación (ANEXO_C §3) ──
    // RN-02-04: lo que no es propio se controla físicamente pero no entra al
    // patrimonio, así que no se deprecia.
    if (b.condicion_tenencia !== 'PROPIO') {
      excluir(b, { ambito: 'DEPRECIACION', estado: 'NO_APLICA', motivo: `RN-02-04: el bien es ${b.condicion_tenencia.toLowerCase()} y no entra al patrimonio de la entidad.` });
      continue;
    }

    // La aplicación no reconoce deterioro: exige indicios y un avalúo que no
    // hace (Guía 003 de la CGN). Lo reconocido fuera no se trae; el informe lo dice.
    const deterioroAcumulado = comoCentavos(0);
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
        corteId,
        bienId: b.bien_id,
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
      });
    } else {
      excluir(b, { ambito: 'DEPRECIACION', estado: dep.estado, motivo: dep.motivo });
    }
  }

  // Un proceso, un cálculo: el anterior se reemplaza entero (sus resultados caen en cascada).
  ctx.sqlite.prepare('DELETE FROM corte WHERE proceso_id = ?').run(e.procesoId);
  calculoRepo.insertarCorte(ctx.sqlite, { id: corteId, procesoId: e.procesoId, fechaCorte, parametrosJson: JSON.stringify(p), creadoEn: calculadoEn });
  calculoRepo.guardarObsolescencia(ctx.sqlite, filasObs);
  calculoRepo.guardarDepreciacion(ctx.sqlite, filasDep);
  calculoRepo.guardarExclusiones(
    ctx.sqlite,
    exclusiones.map<FilaExclusionParaEscribir>((x) => ({ id: nuevoId(), corteId, bienId: x.bienId, ambito: x.ambito, estado: x.estado, motivo: x.motivo })),
  );

  ctx.bitacora.registrar({
    entidadAfectada: 'corte',
    registroId: corteId,
    accion: 'CALCULAR',
    campo: 'motor',
    valorNuevo: `corte ${fechaCorte}, método ${p.metodo_conteo_meses}: ${filasObs.length} obsolescencias, ${filasDep.length} depreciaciones, ${exclusiones.length} exclusiones`,
  });

  const corte = corteDto(ctx, corteId);
  if (corte === null) throw new Error(`El corte ${corteId} no quedó escrito`);
  return {
    corte,
    resumen: resumenCalculo({ corteId }, ctx),
    exclusiones,
    milisegundos: Math.round(performance.now() - t0),
  };
}
