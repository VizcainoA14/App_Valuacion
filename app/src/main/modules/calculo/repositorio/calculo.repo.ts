/**
 * MOD-07/08 — lectura de las entradas del motor y escritura de sus resultados.
 * SQL a mano: es una operación masiva (una pasada por todo el inventario) y las
 * sentencias se reutilizan preparadas. La transacción la abre el middleware IPC.
 */
import type { Statement } from 'better-sqlite3';
import type { ConexionSqlite } from '../../../infraestructura/db/conexion';

/** Todo lo que el motor necesita de un bien, ya unido con su clase y su hoja de vida. */
export interface EntradaBien {
  readonly bien_id: string;
  readonly codigo_institucional: string;
  readonly descripcion_funcional: string;
  readonly clase_codigo: string;
  readonly servicio_codigo: string;
  readonly estado_actual: string;
  readonly condicion_tenencia: string;
  readonly estado_registro: string;
  readonly es_depreciable: number;
  readonly vida_util_contable_meses: number | null;
  readonly vida_util_tecnica_anios_x10k: number | null;
  readonly vida_util_tecnica_override_x10k: number | null;
  readonly fecha_adquisicion: string | null;
  readonly fecha_puesta_servicio: string | null;
  readonly costo_adquisicion_cent: number | null;
  readonly adiciones_mejoras_cent: number | null;
  readonly estado_operativo: string | null;
  readonly deterioro_cent: number | null;
  readonly correctivo_fallido: number;
}

/**
 * Un correctivo "fallido" es aquel cuyo resultado no fue satisfactorio. `/especificacion/teoria`
 * no fija el catálogo de `mantenimiento.resultado` (CT-17: texto libre), así que
 * se reconoce por lo que la plantilla `PL-05` sugiere y se descarta lo demás.
 */
const SQL_ENTRADAS = `
  SELECT b.id AS bien_id, b.codigo_institucional, b.descripcion_funcional,
         k.codigo AS clase_codigo, v.codigo AS servicio_codigo,
         b.estado_actual, b.condicion_tenencia, b.estado_registro,
         k.es_depreciable, k.vida_util_contable_meses, k.vida_util_tecnica_anios_x10k,
         h.vida_util_tecnica_override_x10k, h.fecha_adquisicion, h.fecha_puesta_servicio,
         h.costo_adquisicion_cent, h.adiciones_mejoras_cent, h.estado_operativo,
         (SELECT d.deterioro_reconocido_cent FROM deterioro d
           WHERE d.ejercicio_id = b.ejercicio_id AND d.bien_id = b.id) AS deterioro_cent,
         EXISTS (SELECT 1 FROM mantenimiento m
                  WHERE m.bien_id = b.id AND upper(m.tipo) LIKE 'CORRECTIVO%'
                    AND m.resultado IS NOT NULL
                    AND upper(m.resultado) NOT LIKE 'SATISFACTORIO%') AS correctivo_fallido
  FROM bien b
    JOIN clase_activo k ON k.id = b.clase_activo_id
    JOIN servicio v ON v.id = b.servicio_id
    LEFT JOIN hoja_vida h ON h.bien_id = b.id
  WHERE b.ejercicio_id = ? AND b.estado_registro <> 'DADO_DE_BAJA'
  ORDER BY b.codigo_institucional`;

export interface FilaObsolescenciaParaEscribir {
  readonly id: string;
  readonly ejercicioId: string;
  readonly bienId: string;
  readonly fechaCorte: string;
  readonly vidaUtilTecnicaAplicada: number;
  readonly edadActualAnios: number;
  readonly indiceObsolescencia: number;
  readonly aniosRestantes: number;
  readonly fechaFinVidaUtil: string;
  readonly semaforo: string;
  readonly obsolescenciaFuncional: number;
  readonly candidatoBaja: number;
  readonly entradaHash: string;
  readonly parametrosHash: string;
  readonly calculadoEn: string;
}

/**
 * `obsolescencia_funcional`, su justificación y el concepto del especialista NO se
 * tocan al recalcular: son juicio humano (RN-05-03), no salida del motor. Un
 * recálculo que los borrara destruiría el trabajo del ingeniero biomédico.
 */
const UPSERT_OBSOLESCENCIA = `
  INSERT INTO calculo_obsolescencia (id, ejercicio_id, bien_id, fecha_corte, vida_util_tecnica_aplicada_x10k,
                                     edad_actual_anios_x10k, indice_obsolescencia_x10k, anios_restantes_x10k,
                                     fecha_fin_vida_util, semaforo, obsolescencia_funcional, candidato_baja,
                                     entrada_hash, parametros_hash, calculado_en)
  VALUES (@id, @ejercicioId, @bienId, @fechaCorte, @vidaUtilTecnicaAplicada,
          @edadActualAnios, @indiceObsolescencia, @aniosRestantes,
          @fechaFinVidaUtil, @semaforo, @obsolescenciaFuncional, @candidatoBaja,
          @entradaHash, @parametrosHash, @calculadoEn)
  ON CONFLICT(ejercicio_id, bien_id) DO UPDATE SET
    fecha_corte = excluded.fecha_corte,
    vida_util_tecnica_aplicada_x10k = excluded.vida_util_tecnica_aplicada_x10k,
    edad_actual_anios_x10k = excluded.edad_actual_anios_x10k,
    indice_obsolescencia_x10k = excluded.indice_obsolescencia_x10k,
    anios_restantes_x10k = excluded.anios_restantes_x10k,
    fecha_fin_vida_util = excluded.fecha_fin_vida_util,
    semaforo = excluded.semaforo,
    candidato_baja = excluded.candidato_baja,
    entrada_hash = excluded.entrada_hash,
    parametros_hash = excluded.parametros_hash,
    calculado_en = excluded.calculado_en`;

export interface FilaDepreciacionParaEscribir {
  readonly id: string;
  readonly ejercicioId: string;
  readonly bienId: string;
  readonly fechaCorte: string;
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
  readonly entradaHash: string;
  readonly parametrosHash: string;
  readonly calculadoEn: string;
}

const UPSERT_DEPRECIACION = `
  INSERT INTO calculo_depreciacion (id, ejercicio_id, bien_id, fecha_corte, valor_adquisicion_cent,
                                    adiciones_mejoras_cent, saldo_final_ajustado_cent, valor_residual_cent,
                                    base_depreciable_cent, fecha_inicio_depreciacion, vida_util_meses,
                                    depreciacion_mensual_x10k, meses_transcurridos_x10k, metodo_conteo_aplicado,
                                    depreciacion_acumulada_cent, deterioro_cent, saldo_por_depreciar_cent,
                                    valor_neto_libros_cent, totalmente_depreciado, entrada_hash,
                                    parametros_hash, calculado_en)
  VALUES (@id, @ejercicioId, @bienId, @fechaCorte, @valorAdquisicion,
          @adicionesMejoras, @saldoFinalAjustado, @valorResidual,
          @baseDepreciable, @fechaInicioDepreciacion, @vidaUtilMeses,
          @depreciacionMensual, @mesesTranscurridos, @metodoConteoAplicado,
          @depreciacionAcumulada, @deterioro, @saldoPorDepreciar,
          @valorNetoLibros, @totalmenteDepreciado, @entradaHash,
          @parametrosHash, @calculadoEn)
  ON CONFLICT(ejercicio_id, bien_id) DO UPDATE SET
    fecha_corte = excluded.fecha_corte,
    valor_adquisicion_cent = excluded.valor_adquisicion_cent,
    adiciones_mejoras_cent = excluded.adiciones_mejoras_cent,
    saldo_final_ajustado_cent = excluded.saldo_final_ajustado_cent,
    valor_residual_cent = excluded.valor_residual_cent,
    base_depreciable_cent = excluded.base_depreciable_cent,
    fecha_inicio_depreciacion = excluded.fecha_inicio_depreciacion,
    vida_util_meses = excluded.vida_util_meses,
    depreciacion_mensual_x10k = excluded.depreciacion_mensual_x10k,
    meses_transcurridos_x10k = excluded.meses_transcurridos_x10k,
    metodo_conteo_aplicado = excluded.metodo_conteo_aplicado,
    depreciacion_acumulada_cent = excluded.depreciacion_acumulada_cent,
    deterioro_cent = excluded.deterioro_cent,
    saldo_por_depreciar_cent = excluded.saldo_por_depreciar_cent,
    valor_neto_libros_cent = excluded.valor_neto_libros_cent,
    totalmente_depreciado = excluded.totalmente_depreciado,
    entrada_hash = excluded.entrada_hash,
    parametros_hash = excluded.parametros_hash,
    calculado_en = excluded.calculado_en`;

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

export const calculoRepo = {
  entradas(db: ConexionSqlite, ejercicioId: string): EntradaBien[] {
    return preparado(db, SQL_ENTRADAS).all(ejercicioId) as EntradaBien[];
  },

  /** Juicio humano ya registrado, para no perderlo al recalcular (RN-05-03). */
  obsolescenciaFuncionalPrevia(db: ConexionSqlite, ejercicioId: string): ReadonlyMap<string, boolean> {
    const filas = db.prepare('SELECT bien_id, obsolescencia_funcional FROM calculo_obsolescencia WHERE ejercicio_id = ?').all(ejercicioId) as {
      bien_id: string;
      obsolescencia_funcional: number;
    }[];
    return new Map(filas.map((f) => [f.bien_id, f.obsolescencia_funcional === 1]));
  },

  guardarObsolescencia(db: ConexionSqlite, filas: readonly FilaObsolescenciaParaEscribir[]): number {
    const s = preparado(db, UPSERT_OBSOLESCENCIA);
    for (const f of filas) s.run(f);
    return filas.length;
  },

  guardarDepreciacion(db: ConexionSqlite, filas: readonly FilaDepreciacionParaEscribir[]): number {
    const s = preparado(db, UPSERT_DEPRECIACION);
    for (const f of filas) s.run(f);
    return filas.length;
  },

  /**
   * Un bien que dejó de ser calculable (le quitaron el costo, cambió de clase,
   * se dio de baja) no puede conservar el resultado viejo: sería una cifra que ya
   * nadie sostiene.
   *
   * Se compara contra la lista de bienes que SÍ se calcularon, no contra la marca
   * de tiempo: dos corridas dentro del mismo milisegundo comparten `calculado_en`
   * y la limpieza no ocurriría.
   */
  borrarSobrantes(db: ConexionSqlite, ejercicioId: string, tabla: 'calculo_obsolescencia' | 'calculo_depreciacion', conservar: readonly string[]): number {
    if (conservar.length === 0) {
      return db.prepare(`DELETE FROM ${tabla} WHERE ejercicio_id = ?`).run(ejercicioId).changes;
    }
    // Los marcadores van en lotes: SQLite limita el número de parámetros ligados.
    const LOTE = 500;
    let borradas = 0;
    const conservados = new Set(conservar);
    const existentes = (db.prepare(`SELECT bien_id FROM ${tabla} WHERE ejercicio_id = ?`).all(ejercicioId) as { bien_id: string }[]).map((f) => f.bien_id);
    const sobrantes = existentes.filter((id) => !conservados.has(id));
    for (let i = 0; i < sobrantes.length; i += LOTE) {
      const trozo = sobrantes.slice(i, i + LOTE);
      borradas += db.prepare(`DELETE FROM ${tabla} WHERE ejercicio_id = ? AND bien_id IN (${trozo.map(() => '?').join(',')})`).run(ejercicioId, ...trozo).changes;
    }
    return borradas;
  },

  marcarObsolescenciaFuncional(db: ConexionSqlite, ejercicioId: string, bienId: string, funcional: boolean, justificacion: string): number {
    return db
      .prepare(
        `UPDATE calculo_obsolescencia
            SET obsolescencia_funcional = ?, justificacion_funcional = ?,
                candidato_baja = CASE WHEN ? = 1 THEN 1 ELSE candidato_baja END
          WHERE ejercicio_id = ? AND bien_id = ?`,
      )
      .run(funcional ? 1 : 0, justificacion, funcional ? 1 : 0, ejercicioId, bienId).changes;
  },
};
