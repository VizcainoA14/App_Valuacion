/**
 * Lectura de lo ya calculado: los cortes, el resumen de uno y su listado bien a
 * bien. Nada de aritmética de negocio; las sumas son de presentación y siguen
 * `RED-05` (se suman los valores redondeados de detalle, para que el total
 * mostrado coincida con la suma de las filas visibles).
 */
import type { ContextoIpc } from '../../../ipc/registroIpc';
import type { EntradaValidadaDe } from '../../../../compartido/ipc/contrato';
import type { AmbitoExclusion, CorteDto, ExclusionCalculoDto, FilaCalculoDto, ResumenCalculoDto } from '../../../../compartido/dtos/calculo';
import type { Pagina } from '../../../../compartido/dtos/inventario';
import type { Centavos, FechaIso, MarcaTiempo, Uuid } from '../../../../compartido/tipos/basicos';
import { comoCentavos } from '../../../../compartido/tipos/basicos';
import { SEMAFORO, type Semaforo } from '../../../../compartido/enums/catalogos';
import type { MotivoNoCalculado } from '../../../../compartido/motor/resultado';
import { ErrorValidacion } from '../../../../compartido/errores';
import { EsquemaParametrosCalculo } from '../../../../compartido/parametros/parametrosCalculo';

const X10K = 10_000;

/**
 * Los bienes que entraron al corte. Todo bien que entra tiene exactamente una
 * fila de obsolescencia o una exclusión de obsolescencia (así lo escribe
 * `calcularCorte`); los que ni existían a la fecha solo tienen una exclusión
 * GENERAL y quedan fuera.
 */
const BIENES_DEL_CORTE = `
  SELECT bien_id FROM calculo_obsolescencia WHERE corte_id = @corte
  UNION ALL SELECT bien_id FROM calculo_exclusion WHERE corte_id = @corte AND ambito = 'OBSOLESCENCIA'`;

interface FilaCorte {
  id: string;
  proceso_id: string;
  fecha_corte: string;
  parametros_json: string;
  creado_en: string;
  considerados: number;
  con_depreciacion: number;
  exclusiones: number;
  neto: number;
}

const SELECT_CORTE = `
  SELECT c.id, c.proceso_id, c.fecha_corte, c.parametros_json, c.creado_en,
         (SELECT COUNT(*) FROM calculo_obsolescencia o WHERE o.corte_id = c.id)
           + (SELECT COUNT(*) FROM calculo_exclusion x WHERE x.corte_id = c.id AND x.ambito = 'OBSOLESCENCIA') AS considerados,
         (SELECT COUNT(*) FROM calculo_depreciacion d WHERE d.corte_id = c.id) AS con_depreciacion,
         (SELECT COUNT(*) FROM calculo_exclusion x WHERE x.corte_id = c.id) AS exclusiones,
         (SELECT COALESCE(SUM(d.valor_neto_libros_cent), 0) FROM calculo_depreciacion d WHERE d.corte_id = c.id) AS neto
  FROM corte c`;

function aCorteDto(f: FilaCorte): CorteDto {
  return {
    id: f.id as Uuid,
    procesoId: f.proceso_id as Uuid,
    fechaCorte: f.fecha_corte as FechaIso,
    parametros: EsquemaParametrosCalculo.parse(JSON.parse(f.parametros_json)),
    calculadoEn: f.creado_en as MarcaTiempo,
    bienesConsiderados: f.considerados,
    conDepreciacion: f.con_depreciacion,
    exclusiones: f.exclusiones,
    totalValorNetoLibros: comoCentavos(f.neto),
  };
}

export function corteDto(ctx: ContextoIpc, id: string): CorteDto | null {
  const f = ctx.sqlite.prepare(`${SELECT_CORTE} WHERE c.id = ?`).get(id) as FilaCorte | undefined;
  return f === undefined ? null : aCorteDto(f);
}

export function exigirCorte(ctx: ContextoIpc, id: string): CorteDto {
  const c = corteDto(ctx, id);
  if (c === null) throw new ErrorValidacion('CORTE_INEXISTENTE', 'El corte no existe.', { campo: 'corteId' });
  return c;
}

/** El cálculo del proceso, si ya se hizo. */
export function corteActual(e: EntradaValidadaDe<'corte:actual'>, ctx: ContextoIpc): CorteDto | null {
  const f = ctx.sqlite.prepare(`${SELECT_CORTE} WHERE c.proceso_id = ?`).get(e.procesoId) as FilaCorte | undefined;
  return f === undefined ? null : aCorteDto(f);
}

export function cortePorId(e: EntradaValidadaDe<'corte:porId'>, ctx: ContextoIpc): CorteDto | null {
  return corteDto(ctx, e.id);
}

const SELECT_FILAS = `
  SELECT b.id AS bien_id, b.codigo_institucional, b.descripcion_funcional,
         k.codigo AS clase_codigo, v.codigo AS servicio_codigo, b.estado_actual,
         h.fecha_adquisicion, h.costo_adquisicion_cent,
         o.indice_obsolescencia_x10k, o.edad_actual_anios_x10k, o.anios_restantes_x10k,
         o.fecha_fin_vida_util, o.semaforo, o.obsolescencia_funcional, o.candidato_baja,
         d.saldo_final_ajustado_cent, d.depreciacion_acumulada_cent, d.saldo_por_depreciar_cent,
         d.valor_neto_libros_cent, d.meses_transcurridos_x10k, d.totalmente_depreciado
  FROM bien b
    JOIN clase_activo k ON k.id = b.clase_activo_id
    JOIN servicio v ON v.id = b.servicio_id
    LEFT JOIN hoja_vida h ON h.bien_id = b.id
    LEFT JOIN calculo_obsolescencia o ON o.bien_id = b.id AND o.corte_id = @corte
    LEFT JOIN calculo_depreciacion d ON d.bien_id = b.id AND d.corte_id = @corte`;

interface FilaCruda {
  bien_id: string;
  codigo_institucional: string;
  descripcion_funcional: string;
  clase_codigo: string;
  servicio_codigo: string;
  estado_actual: string;
  fecha_adquisicion: string | null;
  costo_adquisicion_cent: number | null;
  indice_obsolescencia_x10k: number | null;
  edad_actual_anios_x10k: number | null;
  anios_restantes_x10k: number | null;
  fecha_fin_vida_util: string | null;
  semaforo: string | null;
  obsolescencia_funcional: number | null;
  candidato_baja: number | null;
  saldo_final_ajustado_cent: number | null;
  depreciacion_acumulada_cent: number | null;
  saldo_por_depreciar_cent: number | null;
  valor_neto_libros_cent: number | null;
  meses_transcurridos_x10k: number | null;
  totalmente_depreciado: number | null;
}

const x10k = (v: number | null): number | null => (v === null ? null : v / X10K);
const cent = (v: number | null): Centavos | null => (v === null ? null : (v as Centavos));

function aDto(f: FilaCruda): FilaCalculoDto {
  return {
    bienId: f.bien_id as Uuid,
    codigoInstitucional: f.codigo_institucional,
    descripcionFuncional: f.descripcion_funcional,
    claseCodigo: f.clase_codigo,
    servicioCodigo: f.servicio_codigo,
    estadoActual: f.estado_actual,
    fechaAdquisicion: f.fecha_adquisicion === null ? null : (f.fecha_adquisicion as FechaIso),
    costoAdquisicion: cent(f.costo_adquisicion_cent),
    indiceObsolescencia: x10k(f.indice_obsolescencia_x10k),
    edadActualAnios: x10k(f.edad_actual_anios_x10k),
    aniosRestantes: x10k(f.anios_restantes_x10k),
    fechaFinVidaUtil: f.fecha_fin_vida_util === null ? null : (f.fecha_fin_vida_util as FechaIso),
    semaforo: f.semaforo === null ? null : (f.semaforo as Semaforo),
    obsolescenciaFuncional: f.obsolescencia_funcional === 1,
    candidatoBaja: f.candidato_baja === 1,
    saldoFinalAjustado: cent(f.saldo_final_ajustado_cent),
    depreciacionAcumulada: cent(f.depreciacion_acumulada_cent),
    saldoPorDepreciar: cent(f.saldo_por_depreciar_cent),
    valorNetoLibros: cent(f.valor_neto_libros_cent),
    mesesTranscurridos: x10k(f.meses_transcurridos_x10k),
    totalmenteDepreciado: f.totalmente_depreciado === 1,
  };
}

export function listarCalculo(e: EntradaValidadaDe<'calculo:listar'>, ctx: ContextoIpc): Pagina<FilaCalculoDto> {
  exigirCorte(ctx, e.corteId);
  const condiciones = [`b.id IN (${BIENES_DEL_CORTE})`];
  const params: Record<string, unknown> = { corte: e.corteId };
  if (e.semaforo !== undefined) {
    condiciones.push('o.semaforo = @semaforo');
    params['semaforo'] = e.semaforo;
  }
  if (e.soloCandidatosBaja) condiciones.push('o.candidato_baja = 1');
  const texto = e.texto?.trim() ?? '';
  if (texto !== '') {
    condiciones.push('(b.codigo_institucional LIKE @texto OR b.descripcion_funcional LIKE @texto)');
    params['texto'] = `%${texto}%`;
  }
  const donde = condiciones.join(' AND ');

  const total = (
    ctx.sqlite
      .prepare(
        `SELECT COUNT(*) AS n FROM bien b
           LEFT JOIN calculo_obsolescencia o ON o.bien_id = b.id AND o.corte_id = @corte
          WHERE ${donde}`,
      )
      .get(params) as { n: number }
  ).n;

  // Los más obsoletos primero: son los que hay que mirar, y los nulos (no
  // calculables) van al final para que no tapen el trabajo pendiente de verdad.
  const filas = ctx.sqlite
    .prepare(`${SELECT_FILAS} WHERE ${donde} ORDER BY o.indice_obsolescencia_x10k IS NULL, o.indice_obsolescencia_x10k DESC, b.codigo_institucional LIMIT @limite OFFSET @desde`)
    .all({ ...params, limite: e.tamano, desde: e.pagina * e.tamano }) as FilaCruda[];

  return { filas: filas.map(aDto), total, pagina: e.pagina, tamano: e.tamano };
}

export function listarExclusiones(e: EntradaValidadaDe<'calculo:exclusiones'>, ctx: ContextoIpc): ExclusionCalculoDto[] {
  exigirCorte(ctx, e.corteId);
  return (
    ctx.sqlite
      .prepare(
        `SELECT x.bien_id, b.codigo_institucional, x.ambito, x.estado, x.motivo
           FROM calculo_exclusion x JOIN bien b ON b.id = x.bien_id
          WHERE x.corte_id = ?
          ORDER BY x.ambito, b.codigo_institucional`,
      )
      .all(e.corteId) as { bien_id: string; codigo_institucional: string; ambito: string; estado: string; motivo: string }[]
  ).map((f) => ({
    bienId: f.bien_id as Uuid,
    codigoInstitucional: f.codigo_institucional,
    ambito: f.ambito as AmbitoExclusion,
    estado: f.estado as MotivoNoCalculado,
    motivo: f.motivo,
  }));
}

export function resumenCalculo(e: EntradaValidadaDe<'calculo:resumen'>, ctx: ContextoIpc): ResumenCalculoDto {
  const corte = exigirCorte(ctx, e.corteId);
  const id = e.corteId;

  const obs = ctx.sqlite.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(candidato_baja), 0) AS candidatos FROM calculo_obsolescencia WHERE corte_id = ?').get(id) as {
    n: number;
    candidatos: number;
  };

  const porSemaforoFilas = ctx.sqlite.prepare('SELECT semaforo, COUNT(*) AS n FROM calculo_obsolescencia WHERE corte_id = ? GROUP BY semaforo').all(id) as {
    semaforo: string;
    n: number;
  }[];
  const porSemaforo = Object.fromEntries(SEMAFORO.valores.map((s) => [s, 0])) as Record<Semaforo, number>;
  for (const f of porSemaforoFilas) if (SEMAFORO.es(f.semaforo)) porSemaforo[f.semaforo] = f.n;

  const dep = ctx.sqlite
    .prepare(
      `SELECT COUNT(*) AS n,
              COALESCE(SUM(saldo_final_ajustado_cent), 0) AS saldo,
              COALESCE(SUM(depreciacion_acumulada_cent), 0) AS acumulada,
              COALESCE(SUM(deterioro_cent), 0) AS deterioro,
              COALESCE(SUM(valor_neto_libros_cent), 0) AS neto
         FROM calculo_depreciacion WHERE corte_id = ?`,
    )
    .get(id) as { n: number; saldo: number; acumulada: number; deterioro: number; neto: number };

  // A quién la depreciación no le corresponde (NO_APLICA) y a quién sí pero no se pudo calcular.
  const excl = ctx.sqlite
    .prepare(
      `SELECT COALESCE(SUM(estado = 'NO_APLICA'), 0) AS no_aplica, COALESCE(SUM(estado <> 'NO_APLICA'), 0) AS sin_calculo
         FROM calculo_exclusion WHERE corte_id = ? AND ambito = 'DEPRECIACION'`,
    )
    .get(id) as { no_aplica: number; sin_calculo: number };

  return {
    corteId: corte.id,
    fechaCorte: corte.fechaCorte,
    calculadoEn: corte.calculadoEn,
    metodoConteoAplicado: corte.parametros.metodo_conteo_meses,
    bienesConsiderados: corte.bienesConsiderados,
    conObsolescencia: obs.n,
    sinObsolescencia: corte.bienesConsiderados - obs.n,
    conDepreciacion: dep.n,
    noAplicaDepreciacion: excl.no_aplica,
    sinDepreciacion: excl.sin_calculo,
    candidatosBaja: obs.candidatos,
    porSemaforo,
    totalSaldoAjustado: comoCentavos(dep.saldo),
    totalDepreciacionAcumulada: comoCentavos(dep.acumulada),
    totalDeterioro: comoCentavos(dep.deterioro),
    totalValorNetoLibros: comoCentavos(dep.neto),
    inventarioCambio: inventarioCambioDesde(ctx, corte.procesoId, corte.calculadoEn),
  };
}

/**
 * El corte sigue siendo válido para su fecha, pero si el inventario cambió
 * después —un barrido, un PL-05 corregido, una baja— sus cifras ya no lo
 * reflejan. Se avisa; no se recalcula solo.
 */
function inventarioCambioDesde(ctx: ContextoIpc, procesoId: string, calculadoEn: string): boolean {
  const fila = ctx.sqlite
    .prepare(
      `SELECT EXISTS (
         SELECT 1 FROM bien b LEFT JOIN hoja_vida h ON h.bien_id = b.id
          WHERE b.proceso_id = ?
            AND MAX(b.actualizado_en, COALESCE(h.actualizado_en, b.actualizado_en)) > ?
       ) AS cambiado`,
    )
    .get(procesoId, calculadoEn) as { cambiado: number };
  return fila.cambiado === 1;
}
