/**
 * MOD-04 · escritura de hojas de vida. SQL a mano por el mismo motivo que el
 * listado de bienes: es una carga masiva (una hoja por bien) y la sentencia se
 * reutiliza preparada. La transacción la abre el middleware IPC.
 */
import type { Statement } from 'better-sqlite3';
import type { ConexionSqlite } from '../../../infraestructura/db/conexion';

export interface HojaVidaParaEscribir {
  readonly id: string;
  readonly bienId: string;
  readonly tipoInstalacion: string | null;
  readonly registroInvima: string | null;
  readonly especificaciones: string | null;
  readonly fabricante: string | null;
  readonly paisOrigen: string | null;
  readonly estadoOperativo: string;
  readonly formaAdquisicion: string;
  readonly fechaAdquisicion: string | null;
  readonly documentoAdquisicion: string | null;
  readonly numeroFactura: string | null;
  readonly proveedor: string | null;
  readonly costoAdquisicionCent: number | null;
  readonly adicionesMejorasCent: number;
  readonly fuenteFinanciacion: string | null;
  readonly fechaPuestaServicio: string | null;
  readonly vidaUtilTecnicaOverrideX10k: number | null;
  readonly justificacionOverride: string | null;
  readonly creadoEn: string;
  readonly actualizadoEn: string;
}

export interface MantenimientoParaEscribir {
  readonly id: string;
  readonly bienId: string;
  readonly fecha: string;
  readonly tipo: string;
  readonly descripcion: string;
  readonly ejecutadoPor: string | null;
  readonly costoCent: number | null;
  readonly resultado: string | null;
  readonly creadoEn: string;
}

export interface SoporteParaEscribir {
  readonly id: string;
  readonly bienId: string;
  readonly tipoDocumento: string;
  readonly url: string;
  readonly hashSha256: string;
  readonly cargadoEn: string;
}

/**
 * `ON CONFLICT(bien_id)` sobre el índice único `ux_hoja_vida_bien`: reimportar
 * PL-05 corregido actualiza la hoja existente en vez de fallar, que es lo que el
 * hospital hace cuando aparece la factura que faltaba.
 */
const UPSERT_HOJA = `
  INSERT INTO hoja_vida (id, bien_id, tipo_instalacion, registro_invima, especificaciones, fabricante,
                         pais_origen, estado_operativo, forma_adquisicion, fecha_adquisicion,
                         documento_adquisicion, numero_factura, proveedor, costo_adquisicion_cent,
                         adiciones_mejoras_cent, fuente_financiacion, fecha_puesta_servicio,
                         vida_util_tecnica_override_x10k, justificacion_override, creado_en, actualizado_en)
  VALUES (@id, @bienId, @tipoInstalacion, @registroInvima, @especificaciones, @fabricante,
          @paisOrigen, @estadoOperativo, @formaAdquisicion, @fechaAdquisicion,
          @documentoAdquisicion, @numeroFactura, @proveedor, @costoAdquisicionCent,
          @adicionesMejorasCent, @fuenteFinanciacion, @fechaPuestaServicio,
          @vidaUtilTecnicaOverrideX10k, @justificacionOverride, @creadoEn, @actualizadoEn)
  ON CONFLICT(bien_id) DO UPDATE SET
    tipo_instalacion = excluded.tipo_instalacion,
    registro_invima = excluded.registro_invima,
    especificaciones = excluded.especificaciones,
    fabricante = excluded.fabricante,
    pais_origen = excluded.pais_origen,
    estado_operativo = excluded.estado_operativo,
    forma_adquisicion = excluded.forma_adquisicion,
    fecha_adquisicion = excluded.fecha_adquisicion,
    documento_adquisicion = excluded.documento_adquisicion,
    numero_factura = excluded.numero_factura,
    proveedor = excluded.proveedor,
    costo_adquisicion_cent = excluded.costo_adquisicion_cent,
    adiciones_mejoras_cent = excluded.adiciones_mejoras_cent,
    fuente_financiacion = excluded.fuente_financiacion,
    fecha_puesta_servicio = excluded.fecha_puesta_servicio,
    vida_util_tecnica_override_x10k = excluded.vida_util_tecnica_override_x10k,
    justificacion_override = excluded.justificacion_override,
    actualizado_en = excluded.actualizado_en`;

const INSERT_MANTENIMIENTO = `
  INSERT INTO mantenimiento (id, bien_id, fecha, tipo, descripcion, ejecutado_por, costo_cent, resultado, creado_en)
  VALUES (@id, @bienId, @fecha, @tipo, @descripcion, @ejecutadoPor, @costoCent, @resultado, @creadoEn)`;

const INSERT_SOPORTE = `
  INSERT INTO soporte_documental (id, bien_id, tipo_documento, url, hash_sha256, cargado_en)
  VALUES (@id, @bienId, @tipoDocumento, @url, @hashSha256, @cargadoEn)`;

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

export const hojaVidaRepo = {
  /** Devuelve cuántas hojas eran nuevas; el resto se actualizaron. */
  guardarLote(db: ConexionSqlite, hojas: readonly HojaVidaParaEscribir[]): { creadas: number; actualizadas: number } {
    if (hojas.length === 0) return { creadas: 0, actualizadas: 0 };
    const existentes = new Set(
      (db.prepare(`SELECT bien_id FROM hoja_vida WHERE bien_id IN (${hojas.map(() => '?').join(',')})`).all(...hojas.map((h) => h.bienId)) as { bien_id: string }[]).map((f) => f.bien_id),
    );
    const sentencia = preparado(db, UPSERT_HOJA);
    for (const h of hojas) sentencia.run(h);
    const actualizadas = hojas.filter((h) => existentes.has(h.bienId)).length;
    return { creadas: hojas.length - actualizadas, actualizadas };
  },

  insertarMantenimientos(db: ConexionSqlite, filas: readonly MantenimientoParaEscribir[]): number {
    const sentencia = preparado(db, INSERT_MANTENIMIENTO);
    for (const m of filas) sentencia.run(m);
    return filas.length;
  },

  /** Los mantenimientos no tienen clave natural: se evita repetir el mismo (bien, fecha, tipo). */
  mantenimientosExistentes(db: ConexionSqlite, bienIds: readonly string[]): ReadonlySet<string> {
    if (bienIds.length === 0) return new Set();
    const filas = db
      .prepare(`SELECT bien_id, fecha, tipo FROM mantenimiento WHERE bien_id IN (${bienIds.map(() => '?').join(',')})`)
      .all(...bienIds) as { bien_id: string; fecha: string; tipo: string }[];
    return new Set(filas.map((f) => `${f.bien_id}|${f.fecha}|${f.tipo.toUpperCase()}`));
  },

  insertarSoportes(db: ConexionSqlite, filas: readonly SoporteParaEscribir[]): number {
    const sentencia = preparado(db, INSERT_SOPORTE);
    for (const s of filas) sentencia.run(s);
    return filas.length;
  },

  /** Bienes del ejercicio indexados por su código institucional, para resolver PL-05. */
  bienesPorCodigo(db: ConexionSqlite, ejercicioId: string): ReadonlyMap<string, { id: string; estadoRegistro: string }> {
    const filas = db.prepare('SELECT id, codigo_institucional, estado_registro FROM bien WHERE ejercicio_id = ?').all(ejercicioId) as {
      id: string;
      codigo_institucional: string;
      estado_registro: string;
    }[];
    return new Map(filas.map((f) => [f.codigo_institucional.trim().toUpperCase(), { id: f.id, estadoRegistro: f.estado_registro }]));
  },

  /**
   * RN-03-01: con fecha y costo el bien deja de estar INCOMPLETO. Se marca
   * VALIDADO —no ACTIVO— porque activarlo es decisión del cierre del paso 03.
   */
  marcarValidados(db: ConexionSqlite, bienIds: readonly string[], actualizadoEn: string): number {
    if (bienIds.length === 0) return 0;
    return db
      .prepare(`UPDATE bien SET estado_registro = 'VALIDADO', actualizado_en = ? WHERE estado_registro IN ('BORRADOR', 'INCOMPLETO') AND id IN (${bienIds.map(() => '?').join(',')})`)
      .run(actualizadoEn, ...bienIds).changes;
  },
};
