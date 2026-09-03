/**
 * Lectura de lo ya calculado: el resumen del ejercicio y el listado bien a bien.
 * Nada de aritmética de negocio; las sumas son de presentación y siguen `RED-05`
 * (se suman los valores redondeados de detalle, para que el total mostrado
 * coincida con la suma de las filas visibles).
 */
import type { ContextoIpc } from '../../../ipc/registroIpc';
import type { EntradaValidadaDe } from '../../../../compartido/ipc/contrato';
import type { FilaCalculoDto, ResumenCalculoDto } from '../../../../compartido/dtos/calculo';
import type { Pagina } from '../../../../compartido/dtos/inventario';
import type { Centavos, FechaIso, MarcaTiempo, Uuid } from '../../../../compartido/tipos/basicos';
import { comoCentavos } from '../../../../compartido/tipos/basicos';
import { SEMAFORO, type Semaforo } from '../../../../compartido/enums/catalogos';
import type { MetodoConteoMeses } from '../../../../compartido/enums/parametros';
import { ErrorValidacion } from '../../../../compartido/errores';
import { calculoRepo } from '../repositorio/calculo.repo';

const X10K = 10_000;

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
    LEFT JOIN calculo_obsolescencia o ON o.bien_id = b.id AND o.ejercicio_id = b.ejercicio_id
    LEFT JOIN calculo_depreciacion d ON d.bien_id = b.id AND d.ejercicio_id = b.ejercicio_id`;

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
  const condiciones = [`b.ejercicio_id = ?`, `b.estado_registro <> 'DADO_DE_BAJA'`];
  const params: unknown[] = [e.ejercicioId];
  if (e.semaforo !== undefined) {
    condiciones.push('o.semaforo = ?');
    params.push(e.semaforo);
  }
  if (e.soloCandidatosBaja) condiciones.push('o.candidato_baja = 1');
  const texto = e.texto?.trim() ?? '';
  if (texto !== '') {
    condiciones.push('(b.codigo_institucional LIKE ? OR b.descripcion_funcional LIKE ?)');
    params.push(`%${texto}%`, `%${texto}%`);
  }
  const donde = condiciones.join(' AND ');

  const total = (
    ctx.sqlite
      .prepare(
        `SELECT COUNT(*) AS n FROM bien b
           LEFT JOIN calculo_obsolescencia o ON o.bien_id = b.id AND o.ejercicio_id = b.ejercicio_id
          WHERE ${donde}`,
      )
      .get(...params) as { n: number }
  ).n;

  // Los más obsoletos primero: son los que hay que mirar, y los nulos (no
  // calculables) van al final para que no tapen el trabajo pendiente de verdad.
  const filas = ctx.sqlite
    .prepare(`${SELECT_FILAS} WHERE ${donde} ORDER BY o.indice_obsolescencia_x10k IS NULL, o.indice_obsolescencia_x10k DESC, b.codigo_institucional LIMIT ? OFFSET ?`)
    .all(...params, e.tamano, e.pagina * e.tamano) as FilaCruda[];

  return { filas: filas.map(aDto), total, pagina: e.pagina, tamano: e.tamano };
}

export function resumenCalculo(e: EntradaValidadaDe<'calculo:resumen'>, ctx: ContextoIpc): ResumenCalculoDto {
  const ejercicio = ctx.sqlite.prepare('SELECT id, fecha_corte FROM ejercicio WHERE id = ?').get(e.ejercicioId) as { id: string; fecha_corte: string } | undefined;
  if (ejercicio === undefined) throw new ErrorValidacion('EJERCICIO_INEXISTENTE', 'El ejercicio no existe.', { campo: 'ejercicioId' });

  const vivos = (ctx.sqlite.prepare(`SELECT COUNT(*) AS n FROM bien WHERE ejercicio_id = ? AND estado_registro <> 'DADO_DE_BAJA'`).get(e.ejercicioId) as { n: number }).n;

  const obs = ctx.sqlite
    .prepare(
      `SELECT COUNT(*) AS n, SUM(candidato_baja) AS candidatos, MAX(calculado_en) AS calculado_en,
              SUM(entrada_hash IS NULL) AS sin_hash
         FROM calculo_obsolescencia WHERE ejercicio_id = ?`,
    )
    .get(e.ejercicioId) as { n: number; candidatos: number | null; calculado_en: string | null; sin_hash: number };

  const porSemaforoFilas = ctx.sqlite.prepare('SELECT semaforo, COUNT(*) AS n FROM calculo_obsolescencia WHERE ejercicio_id = ? GROUP BY semaforo').all(e.ejercicioId) as {
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
              COALESCE(SUM(valor_neto_libros_cent), 0) AS neto,
              MAX(metodo_conteo_aplicado) AS metodo, MAX(calculado_en) AS calculado_en
         FROM calculo_depreciacion WHERE ejercicio_id = ?`,
    )
    .get(e.ejercicioId) as { n: number; saldo: number; acumulada: number; deterioro: number; neto: number; metodo: string | null; calculado_en: string | null };

  // Un bien vivo sin fila de obsolescencia es uno que el motor no pudo evaluar;
  // el detalle de POR QUÉ lo da `calculo:ejecutar` en sus exclusiones.
  const noAplicaDepreciacion = (
    ctx.sqlite
      .prepare(
        `SELECT COUNT(*) AS n FROM bien b JOIN clase_activo k ON k.id = b.clase_activo_id
          WHERE b.ejercicio_id = ? AND b.estado_registro <> 'DADO_DE_BAJA'
            AND (b.condicion_tenencia <> 'PROPIO' OR k.es_depreciable = 0)`,
      )
      .get(e.ejercicioId) as { n: number }
  ).n;

  const calculadoEn = obs.calculado_en ?? dep.calculado_en;

  return {
    ejercicioId: ejercicio.id as Uuid,
    fechaCorte: ejercicio.fecha_corte as FechaIso,
    calculadoEn: calculadoEn === null ? null : (calculadoEn as MarcaTiempo),
    metodoConteoAplicado: dep.metodo === null ? null : (dep.metodo as MetodoConteoMeses),
    bienesConsiderados: vivos,
    conObsolescencia: obs.n,
    sinObsolescencia: vivos - obs.n,
    conDepreciacion: dep.n,
    noAplicaDepreciacion,
    sinDepreciacion: Math.max(0, vivos - noAplicaDepreciacion - dep.n),
    candidatosBaja: obs.candidatos ?? 0,
    porSemaforo,
    totalSaldoAjustado: comoCentavos(dep.saldo),
    totalDepreciacionAcumulada: comoCentavos(dep.acumulada),
    totalDeterioro: comoCentavos(dep.deterioro),
    totalValorNetoLibros: comoCentavos(dep.neto),
    desactualizado: calculadoEn !== null && hayEntradasCambiadas(ctx, e.ejercicioId),
  };
}

/**
 * Plan 2.6 §9 — el resultado queda desfasado si un bien se creó o se modificó
 * después de la última corrida. Se compara la marca de tiempo, no las huellas,
 * porque basta para avisar y no obliga a recorrer todo el inventario.
 */
function hayEntradasCambiadas(ctx: ContextoIpc, ejercicioId: string): boolean {
  const fila = ctx.sqlite
    .prepare(
      `SELECT EXISTS (
         SELECT 1 FROM bien b
           LEFT JOIN hoja_vida h ON h.bien_id = b.id
          WHERE b.ejercicio_id = ? AND b.estado_registro <> 'DADO_DE_BAJA'
            AND MAX(b.actualizado_en, COALESCE(h.actualizado_en, b.actualizado_en)) >
                COALESCE((SELECT MAX(calculado_en) FROM calculo_obsolescencia WHERE ejercicio_id = ?), '')
       ) AS cambiado`,
    )
    .get(ejercicioId, ejercicioId) as { cambiado: number };
  return fila.cambiado === 1;
}

export function marcarObsolescenciaFuncional(e: EntradaValidadaDe<'calculo:marcarObsolescenciaFuncional'>, ctx: ContextoIpc): FilaCalculoDto {
  const cambios = calculoRepo.marcarObsolescenciaFuncional(ctx.sqlite, e.ejercicioId, e.bienId, e.funcional, e.justificacion);
  if (cambios === 0) {
    throw new ErrorValidacion('SIN_CALCULO', 'El bien todavía no tiene cálculo de obsolescencia; ejecute el cálculo antes de declarar obsolescencia funcional.', { campo: 'bienId' });
  }
  ctx.bitacora.registrar({
    entidadAfectada: 'calculo_obsolescencia',
    registroId: e.bienId,
    accion: 'ACTUALIZAR',
    campo: 'obsolescencia_funcional',
    valorNuevo: e.funcional ? 'true' : 'false',
    justificacion: e.justificacion,
  });
  const fila = ctx.sqlite.prepare(`${SELECT_FILAS} WHERE b.id = ? AND b.ejercicio_id = ?`).get(e.bienId, e.ejercicioId) as FilaCruda | undefined;
  if (fila === undefined) throw new ErrorValidacion('BIEN_INEXISTENTE', 'El bien no existe en el ejercicio.', { campo: 'bienId' });
  return aDto(fila);
}
