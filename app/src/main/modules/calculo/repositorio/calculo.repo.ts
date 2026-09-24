/**
 * MOD-07/08 — lectura de las entradas del motor y escritura de un corte.
 * SQL a mano: es una operación masiva (una pasada por todo el inventario) y las
 * sentencias se reutilizan preparadas. La transacción la abre el middleware IPC.
 *
 * Un corte se escribe una sola vez: aquí no hay UPDATE ni upsert. Recalcular
 * reemplaza el corte entero (ADR-029).
 */
import type { Statement } from 'better-sqlite3';
import type { ConexionSqlite } from '../../../infraestructura/db/conexion';

/** Todo lo que el motor necesita de un bien, ya unido con su clase y su hoja de vida. */
export interface EntradaBien {
  readonly bien_id: string;
  readonly codigo_institucional: string;
  readonly estado_actual: string;
  readonly condicion_tenencia: string;
  readonly es_depreciable: number;
  readonly vida_util_contable_meses: number | null;
  readonly vida_util_tecnica_anios_x10k: number | null;
  readonly vida_util_tecnica_override_x10k: number | null;
  readonly fecha_adquisicion: string | null;
  readonly fecha_puesta_servicio: string | null;
  readonly costo_adquisicion_cent: number | null;
  readonly adiciones_mejoras_cent: number | null;
  readonly estado_operativo: string | null;
  readonly obsolescencia_funcional: number;
  readonly correctivo_fallido: number;
}

/**
 * Entra todo lo que no se dio de baja, incluido lo NO_ENCONTRADO: hasta que el
 * hospital registre la baja, el bien sigue en sus libros.
 *
 * Un correctivo "fallido" es aquel cuyo resultado no fue satisfactorio.
 * `/especificacion/teoria` no fija el catálogo de `mantenimiento.resultado`
 * (CT-17: texto libre), así que se reconoce por lo que la plantilla `PL-05`
 * sugiere y se descarta lo demás.
 */
const SQL_ENTRADAS = `
  SELECT b.id AS bien_id, b.codigo_institucional, b.estado_actual, b.condicion_tenencia,
         b.obsolescencia_funcional,
         k.es_depreciable, k.vida_util_contable_meses, k.vida_util_tecnica_anios_x10k,
         h.vida_util_tecnica_override_x10k, h.fecha_adquisicion, h.fecha_puesta_servicio,
         h.costo_adquisicion_cent, h.adiciones_mejoras_cent, h.estado_operativo,
         EXISTS (SELECT 1 FROM mantenimiento m
                  WHERE m.bien_id = b.id AND upper(m.tipo) LIKE 'CORRECTIVO%'
                    AND m.resultado IS NOT NULL
                    AND upper(m.resultado) NOT LIKE 'SATISFACTORIO%') AS correctivo_fallido
  FROM bien b
    JOIN clase_activo k ON k.id = b.clase_activo_id
    LEFT JOIN hoja_vida h ON h.bien_id = b.id
  WHERE b.proceso_id = ? AND b.estado_registro <> 'DADO_DE_BAJA'
  ORDER BY b.codigo_institucional`;

export interface FilaObsolescenciaParaEscribir {
  readonly id: string;
  readonly corteId: string;
  readonly bienId: string;
  readonly vidaUtilTecnicaAplicada: number;
  readonly edadActualAnios: number;
  readonly indiceObsolescencia: number;
  readonly aniosRestantes: number;
  readonly fechaFinVidaUtil: string;
  readonly semaforo: string;
  readonly obsolescenciaFuncional: number;
  readonly candidatoBaja: number;
  readonly motivosBaja: string | null;
}

const INSERT_OBSOLESCENCIA = `
  INSERT INTO calculo_obsolescencia (id, corte_id, bien_id, vida_util_tecnica_aplicada_x10k, edad_actual_anios_x10k,
                                     indice_obsolescencia_x10k, anios_restantes_x10k, fecha_fin_vida_util, semaforo,
                                     obsolescencia_funcional, candidato_baja, motivos_baja)
  VALUES (@id, @corteId, @bienId, @vidaUtilTecnicaAplicada, @edadActualAnios,
          @indiceObsolescencia, @aniosRestantes, @fechaFinVidaUtil, @semaforo,
          @obsolescenciaFuncional, @candidatoBaja, @motivosBaja)`;

export interface FilaDepreciacionParaEscribir {
  readonly id: string;
  readonly corteId: string;
  readonly bienId: string;
  readonly valorAdquisicion: number;
  readonly adicionesMejoras: number;
  readonly saldoFinalAjustado: number;
  readonly valorResidual: number;
  readonly baseDepreciable: number;
  readonly fechaInicioDepreciacion: string;
  readonly vidaUtilMeses: number;
  readonly depreciacionMensual: number;
  readonly mesesTranscurridos: number;
  readonly metodoConteoAplicado: string;
  readonly depreciacionAcumulada: number;
  readonly deterioro: number;
  readonly saldoPorDepreciar: number;
  readonly valorNetoLibros: number;
  readonly totalmenteDepreciado: number;
}

const INSERT_DEPRECIACION = `
  INSERT INTO calculo_depreciacion (id, corte_id, bien_id, valor_adquisicion_cent, adiciones_mejoras_cent,
                                    saldo_final_ajustado_cent, valor_residual_cent, base_depreciable_cent,
                                    fecha_inicio_depreciacion, vida_util_meses, depreciacion_mensual_x10k,
                                    meses_transcurridos_x10k, metodo_conteo_aplicado, depreciacion_acumulada_cent,
                                    deterioro_cent, saldo_por_depreciar_cent, valor_neto_libros_cent, totalmente_depreciado)
  VALUES (@id, @corteId, @bienId, @valorAdquisicion, @adicionesMejoras,
          @saldoFinalAjustado, @valorResidual, @baseDepreciable,
          @fechaInicioDepreciacion, @vidaUtilMeses, @depreciacionMensual,
          @mesesTranscurridos, @metodoConteoAplicado, @depreciacionAcumulada,
          @deterioro, @saldoPorDepreciar, @valorNetoLibros, @totalmenteDepreciado)`;

export interface FilaExclusionParaEscribir {
  readonly id: string;
  readonly corteId: string;
  readonly bienId: string;
  readonly ambito: string;
  readonly estado: string;
  readonly motivo: string;
}

const INSERT_EXCLUSION = `
  INSERT INTO calculo_exclusion (id, corte_id, bien_id, ambito, estado, motivo)
  VALUES (@id, @corteId, @bienId, @ambito, @estado, @motivo)`;

const sentencias = new WeakMap<ConexionSqlite, Map<string, Statement>>();

function preparado(db: ConexionSqlite, sql: string): Statement {
  let porConexion = sentencias.get(db);
  if (porConexion === undefined) {
    porConexion = new Map();
    sentencias.set(db, porConexion);
  }
  let s = porConexion.get(sql);
  if (s === undefined) {
    s = db.prepare(sql);
    porConexion.set(sql, s);
  }
  return s;
}

function insertarTodas(db: ConexionSqlite, sql: string, filas: readonly object[]): number {
  const s = preparado(db, sql);
  for (const f of filas) s.run(f);
  return filas.length;
}

export const calculoRepo = {
  entradas(db: ConexionSqlite, procesoId: string): EntradaBien[] {
    return preparado(db, SQL_ENTRADAS).all(procesoId) as EntradaBien[];
  },

  insertarCorte(db: ConexionSqlite, c: { id: string; procesoId: string; fechaCorte: string; parametrosJson: string; creadoEn: string }): void {
    db.prepare(
      `INSERT INTO corte (id, proceso_id, fecha_corte, parametros_json, creado_en)
       VALUES (@id, @procesoId, @fechaCorte, @parametrosJson, @creadoEn)`,
    ).run(c);
  },

  guardarObsolescencia(db: ConexionSqlite, filas: readonly FilaObsolescenciaParaEscribir[]): number {
    return insertarTodas(db, INSERT_OBSOLESCENCIA, filas);
  },

  guardarDepreciacion(db: ConexionSqlite, filas: readonly FilaDepreciacionParaEscribir[]): number {
    return insertarTodas(db, INSERT_DEPRECIACION, filas);
  },

  guardarExclusiones(db: ConexionSqlite, filas: readonly FilaExclusionParaEscribir[]): number {
    return insertarTodas(db, INSERT_EXCLUSION, filas);
  },
};
