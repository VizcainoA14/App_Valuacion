/** MOD-11 — lectura y escritura del paso 09. SQL a mano, como en MOD-03 y MOD-07. */
import type { ConexionSqlite } from '../../../infraestructura/db/conexion';

/** Un candidato con todo lo que el motor y la pantalla necesitan, en una consulta. */
export interface FilaCandidato {
  readonly bien_id: string;
  readonly codigo_institucional: string;
  readonly descripcion_funcional: string;
  readonly clase_codigo: string;
  readonly clase_nombre: string;
  readonly servicio_codigo: string;
  readonly estado_actual: string;
  readonly estado_registro: string;
  readonly estado_operativo: string | null;
  readonly indice_obsolescencia_x10k: number | null;
  readonly semaforo: string | null;
  readonly obsolescencia_funcional: number | null;
  readonly correctivo_fallido: number;
  readonly saldo_final_ajustado_cent: number | null;
  readonly depreciacion_acumulada_cent: number | null;
  readonly deterioro_cent: number | null;
  readonly valor_neto_libros_cent: number | null;
  readonly totalmente_depreciado: number | null;
  readonly propuesta_id: string | null;
  readonly estado_propuesta: string | null;
}

const SELECT_CANDIDATOS = `
  SELECT b.id AS bien_id, b.codigo_institucional, b.descripcion_funcional,
         k.codigo AS clase_codigo, k.nombre AS clase_nombre, v.codigo AS servicio_codigo,
         b.estado_actual, b.estado_registro, h.estado_operativo,
         o.indice_obsolescencia_x10k, o.semaforo, o.obsolescencia_funcional,
         EXISTS (SELECT 1 FROM mantenimiento m
                  WHERE m.bien_id = b.id AND upper(m.tipo) LIKE 'CORRECTIVO%'
                    AND m.resultado IS NOT NULL
                    AND upper(m.resultado) NOT LIKE 'SATISFACTORIO%') AS correctivo_fallido,
         d.saldo_final_ajustado_cent, d.depreciacion_acumulada_cent, d.deterioro_cent,
         d.valor_neto_libros_cent, d.totalmente_depreciado,
         p.id AS propuesta_id, p.estado_aprobacion AS estado_propuesta
  FROM bien b
    JOIN clase_activo k ON k.id = b.clase_activo_id
    JOIN servicio v ON v.id = b.servicio_id
    LEFT JOIN hoja_vida h ON h.bien_id = b.id
    LEFT JOIN calculo_obsolescencia o ON o.bien_id = b.id AND o.ejercicio_id = b.ejercicio_id
    LEFT JOIN calculo_depreciacion d ON d.bien_id = b.id AND d.ejercicio_id = b.ejercicio_id
    LEFT JOIN propuesta_baja p ON p.bien_id = b.id AND p.ejercicio_id = b.ejercicio_id
                              AND p.estado_aprobacion <> 'RECHAZADO'`;

export interface FilaPropuesta {
  readonly id: string;
  readonly ejercicio_id: string;
  readonly bien_id: string;
  readonly codigo_institucional: string;
  readonly descripcion_funcional: string;
  readonly clase_codigo: string;
  readonly servicio_codigo: string;
  readonly causal: string;
  readonly justificacion_tecnica: string;
  readonly costo_reparacion_estimado_cent: number | null;
  readonly valor_reposicion_cent: number | null;
  readonly relacion_reparacion_reposicion_x10k: number | null;
  readonly valor_salvamento_cent: number | null;
  readonly destino_final_propuesto: string | null;
  readonly especialista_id: string;
  readonly especialista_nombre: string;
  readonly fecha_propuesta: string;
  readonly estado_aprobacion: string;
  readonly observacion_comite: string | null;
  readonly saldo_final_ajustado_cent: number | null;
  readonly depreciacion_acumulada_cent: number | null;
  readonly deterioro_cent: number | null;
  readonly creado_en: string;
  readonly actualizado_en: string;
}

const SELECT_PROPUESTAS = `
  SELECT p.id, p.ejercicio_id, p.bien_id, b.codigo_institucional, b.descripcion_funcional,
         k.codigo AS clase_codigo, v.codigo AS servicio_codigo,
         p.causal, p.justificacion_tecnica, p.costo_reparacion_estimado_cent,
         p.valor_reposicion_cent, p.relacion_reparacion_reposicion_x10k, p.valor_salvamento_cent,
         p.destino_final_propuesto, p.especialista_id, r.nombre_completo AS especialista_nombre,
         p.fecha_propuesta, p.estado_aprobacion, p.observacion_comite,
         d.saldo_final_ajustado_cent, d.depreciacion_acumulada_cent, d.deterioro_cent,
         p.creado_en, p.actualizado_en
  FROM propuesta_baja p
    JOIN bien b ON b.id = p.bien_id
    JOIN clase_activo k ON k.id = b.clase_activo_id
    JOIN servicio v ON v.id = b.servicio_id
    JOIN responsable r ON r.id = p.especialista_id
    LEFT JOIN calculo_depreciacion d ON d.bien_id = b.id AND d.ejercicio_id = p.ejercicio_id`;

export interface PropuestaParaInsertar {
  readonly id: string;
  readonly ejercicioId: string;
  readonly bienId: string;
  readonly causal: string;
  readonly justificacionTecnica: string;
  readonly costoReparacionEstimado: number | null;
  readonly valorReposicion: number | null;
  readonly relacionReparacionReposicion: number | null;
  readonly valorSalvamento: number | null;
  readonly destinoFinalPropuesto: string | null;
  readonly especialistaId: string;
  readonly fechaPropuesta: string;
  readonly creadoEn: string;
  readonly actualizadoEn: string;
}

export const bajaRepo = {
  candidatos(db: ConexionSqlite, ejercicioId: string, incluirYaPropuestos: boolean): FilaCandidato[] {
    const filtroPropuesta = incluirYaPropuestos ? '' : ' AND p.id IS NULL';
    return db
      .prepare(
        `${SELECT_CANDIDATOS}
          WHERE b.ejercicio_id = ? AND b.estado_registro <> 'DADO_DE_BAJA'
            AND o.candidato_baja = 1${filtroPropuesta}
          ORDER BY o.indice_obsolescencia_x10k DESC, b.codigo_institucional`,
      )
      .all(ejercicioId) as FilaCandidato[];
  },

  listar(db: ConexionSqlite, ejercicioId: string, estado?: string): FilaPropuesta[] {
    const cond = estado === undefined ? '' : ' AND p.estado_aprobacion = ?';
    const params = estado === undefined ? [ejercicioId] : [ejercicioId, estado];
    return db.prepare(`${SELECT_PROPUESTAS} WHERE p.ejercicio_id = ?${cond} ORDER BY b.codigo_institucional`).all(...params) as FilaPropuesta[];
  },

  porId(db: ConexionSqlite, id: string): FilaPropuesta | null {
    return (db.prepare(`${SELECT_PROPUESTAS} WHERE p.id = ?`).get(id) as FilaPropuesta | undefined) ?? null;
  },

  propuestaVivaDelBien(db: ConexionSqlite, ejercicioId: string, bienId: string): { id: string; estado_aprobacion: string } | null {
    return (
      (db
        .prepare(`SELECT id, estado_aprobacion FROM propuesta_baja WHERE ejercicio_id = ? AND bien_id = ? AND estado_aprobacion <> 'RECHAZADO'`)
        .get(ejercicioId, bienId) as { id: string; estado_aprobacion: string } | undefined) ?? null
    );
  },

  insertar(db: ConexionSqlite, p: PropuestaParaInsertar): void {
    db.prepare(
      `INSERT INTO propuesta_baja (id, ejercicio_id, bien_id, causal, justificacion_tecnica,
                                   costo_reparacion_estimado_cent, valor_reposicion_cent,
                                   relacion_reparacion_reposicion_x10k, valor_salvamento_cent,
                                   destino_final_propuesto, especialista_id, fecha_propuesta,
                                   estado_aprobacion, creado_en, actualizado_en)
       VALUES (@id, @ejercicioId, @bienId, @causal, @justificacionTecnica,
               @costoReparacionEstimado, @valorReposicion,
               @relacionReparacionReposicion, @valorSalvamento,
               @destinoFinalPropuesto, @especialistaId, @fechaPropuesta,
               'PROPUESTO', @creadoEn, @actualizadoEn)`,
    ).run(p);
  },

  actualizar(db: ConexionSqlite, id: string, campos: Readonly<Record<string, string | number | null>>, actualizadoEn: string): number {
    const claves = Object.keys(campos);
    if (claves.length === 0) return 0;
    const asignaciones = claves.map((c) => `${c} = @${c}`).join(', ');
    return db.prepare(`UPDATE propuesta_baja SET ${asignaciones}, actualizado_en = @actualizado_en WHERE id = @id`).run({ ...campos, actualizado_en: actualizadoEn, id }).changes;
  },

  cambiarEstado(db: ConexionSqlite, id: string, nuevoEstado: string, observacion: string | null, actualizadoEn: string): number {
    return db
      .prepare('UPDATE propuesta_baja SET estado_aprobacion = ?, observacion_comite = COALESCE(?, observacion_comite), actualizado_en = ? WHERE id = ?')
      .run(nuevoEstado, observacion, actualizadoEn, id).changes;
  },

  /** El bien acompaña a su propuesta: ACTIVO → PROPUESTO_BAJA, y de vuelta si se rechaza. */
  transicionarBien(db: ConexionSqlite, bienId: string, nuevoEstado: string, actualizadoEn: string): number {
    return db.prepare('UPDATE bien SET estado_registro = ?, actualizado_en = ? WHERE id = ?').run(nuevoEstado, actualizadoEn, bienId).changes;
  },

  estadoDelBien(db: ConexionSqlite, bienId: string): string | null {
    return (db.prepare('SELECT estado_registro FROM bien WHERE id = ?').get(bienId) as { estado_registro: string } | undefined)?.estado_registro ?? null;
  },

  /** Cierre del inventario: VALIDADO → ACTIVO en bloque (ANEXO_B §6.2). */
  activarValidados(db: ConexionSqlite, ejercicioId: string, actualizadoEn: string): number {
    return db.prepare(`UPDATE bien SET estado_registro = 'ACTIVO', actualizado_en = ? WHERE ejercicio_id = ? AND estado_registro = 'VALIDADO'`).run(actualizadoEn, ejercicioId).changes;
  },

  contarCandidatosSinProponer(db: ConexionSqlite, ejercicioId: string): number {
    return (
      db
        .prepare(
          `SELECT COUNT(*) AS n FROM bien b
             JOIN calculo_obsolescencia o ON o.bien_id = b.id AND o.ejercicio_id = b.ejercicio_id
             LEFT JOIN propuesta_baja p ON p.bien_id = b.id AND p.ejercicio_id = b.ejercicio_id AND p.estado_aprobacion <> 'RECHAZADO'
            WHERE b.ejercicio_id = ? AND b.estado_registro <> 'DADO_DE_BAJA' AND o.candidato_baja = 1 AND p.id IS NULL`,
        )
        .get(ejercicioId) as { n: number }
    ).n;
  },

  /** Cuántos bienes vivos tiene cada clase y cuántos se proponen (VAL-09-10). */
  proporcionPorClase(db: ConexionSqlite, ejercicioId: string): { clase: string; vivos: number; propuestos: number }[] {
    return db
      .prepare(
        `SELECT k.codigo AS clase,
                COUNT(*) AS vivos,
                SUM(CASE WHEN p.id IS NOT NULL THEN 1 ELSE 0 END) AS propuestos
           FROM bien b
             JOIN clase_activo k ON k.id = b.clase_activo_id
             LEFT JOIN propuesta_baja p ON p.bien_id = b.id AND p.ejercicio_id = b.ejercicio_id AND p.estado_aprobacion <> 'RECHAZADO'
          WHERE b.ejercicio_id = ? AND b.estado_registro <> 'DADO_DE_BAJA'
          GROUP BY k.codigo`,
      )
      .all(ejercicioId) as { clase: string; vivos: number; propuestos: number }[];
  },
};
