/** MOD-11 — candidatos de un corte y registro de bajas. SQL a mano, como en MOD-03 y MOD-07. */
import type { ConexionSqlite } from '../../../infraestructura/db/conexion';

/** Un candidato de un corte, con lo que la pantalla y el informe necesitan, en una consulta. */
export interface FilaCandidato {
  readonly bien_id: string;
  readonly codigo_institucional: string;
  readonly descripcion_funcional: string;
  readonly clase_codigo: string;
  readonly clase_nombre: string;
  readonly servicio_codigo: string;
  readonly estado_actual: string;
  readonly estado_registro: string;
  readonly indice_obsolescencia_x10k: number;
  readonly semaforo: string;
  readonly obsolescencia_funcional: number;
  readonly motivos_baja: string | null;
  readonly saldo_final_ajustado_cent: number | null;
  readonly valor_neto_libros_cent: number | null;
  readonly totalmente_depreciado: number | null;
}

const SELECT_CANDIDATOS = `
  SELECT b.id AS bien_id, b.codigo_institucional, b.descripcion_funcional,
         k.codigo AS clase_codigo, k.nombre AS clase_nombre, v.codigo AS servicio_codigo,
         b.estado_actual, b.estado_registro,
         o.indice_obsolescencia_x10k, o.semaforo, o.obsolescencia_funcional, o.motivos_baja,
         d.saldo_final_ajustado_cent, d.valor_neto_libros_cent, d.totalmente_depreciado
  FROM calculo_obsolescencia o
    JOIN bien b ON b.id = o.bien_id
    JOIN clase_activo k ON k.id = b.clase_activo_id
    JOIN servicio v ON v.id = b.servicio_id
    LEFT JOIN calculo_depreciacion d ON d.bien_id = o.bien_id AND d.corte_id = o.corte_id
  WHERE o.corte_id = ? AND o.candidato_baja = 1`;

export interface FilaBaja {
  readonly id: string;
  readonly bien_id: string;
  readonly codigo_institucional: string;
  readonly descripcion_funcional: string;
  readonly clase_codigo: string;
  readonly servicio_codigo: string;
  readonly fecha: string;
  readonly causal: string;
  readonly justificacion: string;
  readonly referencia: string | null;
  readonly creado_en: string;
  readonly anulada_en: string | null;
  readonly motivo_anulacion: string | null;
}

const SELECT_BAJAS = `
  SELECT j.id, j.bien_id, b.codigo_institucional, b.descripcion_funcional,
         k.codigo AS clase_codigo, v.codigo AS servicio_codigo,
         j.fecha, j.causal, j.justificacion, j.referencia, j.creado_en, j.anulada_en, j.motivo_anulacion
  FROM baja j
    JOIN bien b ON b.id = j.bien_id
    JOIN clase_activo k ON k.id = b.clase_activo_id
    JOIN servicio v ON v.id = b.servicio_id`;

export const bajaRepo = {
  /** Los más obsoletos primero: son los que hay que mirar. */
  candidatos(db: ConexionSqlite, corteId: string, incluirYaDadosDeBaja: boolean): FilaCandidato[] {
    const filtro = incluirYaDadosDeBaja ? '' : ` AND b.estado_registro <> 'DADO_DE_BAJA'`;
    return db.prepare(`${SELECT_CANDIDATOS}${filtro} ORDER BY o.indice_obsolescencia_x10k DESC, b.codigo_institucional`).all(corteId) as FilaCandidato[];
  },

  listar(db: ConexionSqlite, procesoId: string, incluirAnuladas: boolean): FilaBaja[] {
    const filtro = incluirAnuladas ? '' : ' AND j.anulada_en IS NULL';
    return db.prepare(`${SELECT_BAJAS} WHERE b.proceso_id = ?${filtro} ORDER BY j.fecha DESC, b.codigo_institucional`).all(procesoId) as FilaBaja[];
  },

  porId(db: ConexionSqlite, id: string): FilaBaja | null {
    return (db.prepare(`${SELECT_BAJAS} WHERE j.id = ?`).get(id) as FilaBaja | undefined) ?? null;
  },

  estadoDelBien(db: ConexionSqlite, bienId: string): string | null {
    return (db.prepare('SELECT estado_registro FROM bien WHERE id = ?').get(bienId) as { estado_registro: string } | undefined)?.estado_registro ?? null;
  },

  insertar(db: ConexionSqlite, b: { id: string; bienId: string; fecha: string; causal: string; justificacion: string; referencia: string | null; creadoEn: string }): void {
    db.prepare(
      `INSERT INTO baja (id, bien_id, fecha, causal, justificacion, referencia, creado_en)
       VALUES (@id, @bienId, @fecha, @causal, @justificacion, @referencia, @creadoEn)`,
    ).run(b);
  },

  anular(db: ConexionSqlite, id: string, motivo: string, ahora: string): void {
    db.prepare('UPDATE baja SET anulada_en = ?, motivo_anulacion = ? WHERE id = ?').run(ahora, motivo, id);
  },

  cambiarEstadoBien(db: ConexionSqlite, bienId: string, estado: 'ACTIVO' | 'DADO_DE_BAJA', ahora: string): void {
    db.prepare('UPDATE bien SET estado_registro = ?, actualizado_en = ? WHERE id = ?').run(estado, ahora, bienId);
  },
};
