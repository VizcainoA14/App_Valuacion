/**
 * Listado de bienes con filtro, orden y paginación EN EL MAIN (TR-10, ADR-010):
 * traer 20.000 filas al renderer para filtrar 40 es inaceptable (RNF-01, RG-12).
 * SQL a mano por ser la consulta crítica del sistema (ADR-005 regla 1).
 *
 * ADR-028: el inventario es de la entidad. Cada barrido lo actualiza; nada se
 * reimporta desde cero.
 */
import type { Statement } from 'better-sqlite3';
import type { ConexionSqlite } from '../../../infraestructura/db/conexion';
import type { BarridoDto, BienDto, BienListadoDto, Cobertura, CoberturaServicio, FiltrosBien, OrdenBien, Pagina } from '../../../../compartido/dtos/inventario';
import type { Uuid, FechaIso, Centavos, MarcaTiempo } from '../../../../compartido/tipos/basicos';
import type { EstadoActual, CondicionTenencia } from '../../../../compartido/enums/catalogos';
import type { EstadoBien } from '../../../../compartido/enums/estados';

const COLUMNAS_ORDEN: Readonly<Record<string, string>> = {
  codigoInstitucional: 'b.codigo_institucional',
  placa: 'b.placa',
  descripcionFuncional: 'b.descripcion_funcional',
  claseCodigo: 'k.codigo',
  servicioCodigo: 's.codigo || v.codigo',
  estadoActual: 'b.estado_actual',
  estadoRegistro: 'b.estado_registro',
  costoAdquisicion: 'h.costo_adquisicion_cent',
};

/**
 * Caché de sentencias por conexión: el listado se pide en cada tecleo del usuario
 * y compilar el mismo SQL una y otra vez cuesta más que ejecutarlo. `WeakMap`
 * para que al cerrar la base la caché se libere sola.
 */
const sentencias = new WeakMap<ConexionSqlite, Map<string, Statement>>();

function preparado(db: ConexionSqlite, sql: string): Statement {
  let porConexion = sentencias.get(db);
  if (porConexion === undefined) {
    porConexion = new Map();
    sentencias.set(db, porConexion);
  }
  let sentencia = porConexion.get(sql);
  if (sentencia === undefined) {
    sentencia = db.prepare(sql);
    porConexion.set(sql, sentencia);
  }
  return sentencia;
}

const SELECT_BASE = `
  SELECT b.id, b.codigo_institucional, b.placa, b.descripcion_funcional, b.marca, b.modelo, b.serie,
         b.cantidad, b.estado_actual, b.condicion_tenencia, b.responsable_custodia, b.estado_registro,
         b.obsolescencia_funcional,
         k.codigo AS clase_codigo, k.nombre AS clase_nombre,
         s.codigo AS sede_codigo, v.codigo AS servicio_codigo, v.nombre AS servicio_nombre,
         h.costo_adquisicion_cent, h.fecha_adquisicion, (h.id IS NOT NULL) AS tiene_hoja_vida
  FROM bien b
    JOIN clase_activo k ON k.id = b.clase_activo_id
    JOIN sede s ON s.id = b.sede_id
    JOIN servicio v ON v.id = b.servicio_id
    LEFT JOIN hoja_vida h ON h.bien_id = b.id`;

interface FilaListado {
  id: string;
  codigo_institucional: string;
  placa: string;
  descripcion_funcional: string;
  marca: string | null;
  modelo: string | null;
  serie: string | null;
  cantidad: number;
  estado_actual: string;
  condicion_tenencia: string;
  responsable_custodia: string | null;
  estado_registro: string;
  obsolescencia_funcional: number;
  clase_codigo: string;
  clase_nombre: string;
  sede_codigo: string;
  servicio_codigo: string;
  servicio_nombre: string;
  costo_adquisicion_cent: number | null;
  fecha_adquisicion: string | null;
  tiene_hoja_vida: number;
}

function aListadoDto(f: FilaListado): BienListadoDto {
  return {
    id: f.id as Uuid,
    codigoInstitucional: f.codigo_institucional,
    placa: f.placa,
    descripcionFuncional: f.descripcion_funcional,
    claseCodigo: f.clase_codigo,
    claseNombre: f.clase_nombre,
    marca: f.marca,
    modelo: f.modelo,
    serie: f.serie,
    sedeCodigo: f.sede_codigo,
    servicioCodigo: f.servicio_codigo,
    servicioNombre: f.servicio_nombre,
    cantidad: f.cantidad,
    estadoActual: f.estado_actual as EstadoActual,
    condicionTenencia: f.condicion_tenencia as CondicionTenencia,
    responsableCustodia: f.responsable_custodia,
    estadoRegistro: f.estado_registro as EstadoBien,
    costoAdquisicion: f.costo_adquisicion_cent === null ? null : (f.costo_adquisicion_cent as Centavos),
    fechaAdquisicion: f.fecha_adquisicion === null ? null : (f.fecha_adquisicion as FechaIso),
    tieneHojaVida: f.tiene_hoja_vida === 1,
    obsolescenciaFuncional: f.obsolescencia_funcional === 1,
  };
}

/**
 * Traduce el texto del usuario a una consulta FTS5 segura: cada término va
 * entrecomillado (así "DEMO-0007" no se lee como el operador de columna ni como
 * sintaxis) y con `*` para buscar por prefijo — "moni sig" encuentra "Monitor de
 * signos vitales". Devuelve null si no queda ningún término indexable.
 */
function consultaFts(texto: string): string | null {
  const terminos = texto
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}\p{N}\-_.]/gu, ''))
    .filter((t) => t !== '')
    .map((t) => `"${t}"*`);
  return terminos.length === 0 ? null : terminos.join(' ');
}

/**
 * Construye el WHERE con parámetros ligados (nunca interpolación: P-2 del contrato IPC).
 * El texto libre usa la tabla FTS5 y, en paralelo, LIKE sobre código y placa, que es
 * lo que la gente teclea cuando busca un bien concreto.
 */
function construirFiltro(procesoId: string, filtros: FiltrosBien): { sql: string; params: unknown[] } {
  const condiciones = ['b.proceso_id = ?'];
  const params: unknown[] = [procesoId];

  const texto = filtros.texto?.trim() ?? '';
  if (texto !== '') {
    const consulta = consultaFts(texto);
    const like = `%${texto}%`;
    if (consulta === null) {
      // Sin términos indexables (p. ej. "***"): solo búsqueda literal por código y placa.
      condiciones.push('(b.codigo_institucional LIKE ? OR b.placa LIKE ?)');
      params.push(like, like);
    } else {
      condiciones.push(`(b.id IN (SELECT bien_id FROM bien_fts WHERE bien_fts MATCH ?) OR b.codigo_institucional LIKE ? OR b.placa LIKE ?)`);
      params.push(consulta, like, like);
    }
  }
  const iguales: [keyof FiltrosBien, string][] = [
    ['sedeId', 'b.sede_id'],
    ['servicioId', 'b.servicio_id'],
    ['claseActivoId', 'b.clase_activo_id'],
    ['estadoActual', 'b.estado_actual'],
    ['condicionTenencia', 'b.condicion_tenencia'],
    ['estadoRegistro', 'b.estado_registro'],
  ];
  for (const [clave, columna] of iguales) {
    const valor = filtros[clave];
    if (valor !== undefined && valor !== '') {
      condiciones.push(`${columna} = ?`);
      params.push(valor);
    }
  }
  if (filtros.sinHojaVida === true) condiciones.push('h.id IS NULL');

  return { sql: condiciones.join(' AND '), params };
}

/** Un bien que trae un barrido, con los catálogos ya resueltos a identificadores. */
export interface BienDelBarrido {
  readonly codigoInstitucional: string;
  readonly placa: string;
  readonly descripcionFuncional: string;
  readonly claseActivoId: string;
  readonly marca: string | null;
  readonly modelo: string | null;
  readonly serie: string | null;
  readonly sedeId: string;
  readonly servicioId: string;
  readonly cantidad: number;
  readonly estadoActual: string;
  readonly condicionTenencia: string;
  readonly responsableCustodia: string | null;
  readonly fechaToma: string;
  readonly funcionarioConteo: string;
  readonly observaciones: string | null;
}

// `estado_registro` no se parametriza: un trigger obliga a que TODO bien nazca ACTIVO.
const INSERT_BIEN = `
  INSERT INTO bien (id, proceso_id, codigo_institucional, placa, descripcion_funcional, clase_activo_id,
                    marca, modelo, serie, sede_id, servicio_id, cantidad, estado_actual, condicion_tenencia,
                    responsable_custodia, fecha_toma, funcionario_conteo, observaciones, ultimo_barrido_id,
                    creado_en, actualizado_en)
  VALUES (@id, @procesoId, @codigoInstitucional, @placa, @descripcionFuncional, @claseActivoId,
          @marca, @modelo, @serie, @sedeId, @servicioId, @cantidad, @estadoActual, @condicionTenencia,
          @responsableCustodia, @fechaToma, @funcionarioConteo, @observaciones, @barridoId,
          @ahora, @ahora)`;

/**
 * Lo que el barrido vio del bien reemplaza lo que había: dónde está, en qué
 * estado, quién lo contó. Si estaba NO_ENCONTRADO, reaparece como ACTIVO.
 */
const ACTUALIZAR_BIEN = `
  UPDATE bien SET placa = @placa, clase_activo_id = @claseActivoId, sede_id = @sedeId, servicio_id = @servicioId,
                  cantidad = @cantidad, estado_actual = @estadoActual, condicion_tenencia = @condicionTenencia,
                  responsable_custodia = @responsableCustodia, fecha_toma = @fechaToma,
                  funcionario_conteo = @funcionarioConteo, observaciones = @observaciones,
                  ultimo_barrido_id = @barridoId,
                  estado_registro = CASE WHEN estado_registro = 'NO_ENCONTRADO' THEN 'ACTIVO' ELSE estado_registro END,
                  actualizado_en = @ahora
   WHERE id = @id`;

/**
 * Los cuatro campos que indexa la búsqueda van aparte y SOLO si cambiaron. El
 * disparador de `bien_fts` se activa por nombrar la columna en el SET, cambie o
 * no el valor, y su borrado recorre el índice entero: sobre un barrido de 10.000
 * bienes que no cambiaron de descripción eran 17 s de trabajo inútil.
 */
const ACTUALIZAR_TEXTO_BIEN = `
  UPDATE bien SET descripcion_funcional = @descripcionFuncional, marca = @marca, modelo = @modelo, serie = @serie
   WHERE id = @id
     AND (descripcion_funcional IS NOT @descripcionFuncional OR marca IS NOT @marca
          OR modelo IS NOT @modelo OR serie IS NOT @serie)`;

interface FilaBarrido {
  id: string;
  proceso_id: string;
  fecha: string;
  archivo: string;
  bienes_nuevos: number;
  bienes_actualizados: number;
  bienes_no_encontrados: number;
  servicios_recorridos: number;
  creado_en: string;
}

function aBarridoDto(f: FilaBarrido): BarridoDto {
  return {
    id: f.id as Uuid,
    procesoId: f.proceso_id as Uuid,
    fecha: f.fecha as FechaIso,
    archivo: f.archivo,
    bienesNuevos: f.bienes_nuevos,
    bienesActualizados: f.bienes_actualizados,
    bienesNoEncontrados: f.bienes_no_encontrados,
    serviciosRecorridos: f.servicios_recorridos,
    creadoEn: f.creado_en as MarcaTiempo,
  };
}

export const bienRepo = {
  /** Lo que ya está registrado, indexado por código, para cruzarlo con un barrido. */
  existentes(db: ConexionSqlite, procesoId: string): { id: string; codigo: string; placa: string; estado: EstadoBien; servicioId: string }[] {
    return (
      db.prepare('SELECT id, codigo_institucional, placa, estado_registro, servicio_id FROM bien WHERE proceso_id = ?').all(procesoId) as {
        id: string;
        codigo_institucional: string;
        placa: string;
        estado_registro: string;
        servicio_id: string;
      }[]
    ).map((f) => ({ id: f.id, codigo: f.codigo_institucional, placa: f.placa, estado: f.estado_registro as EstadoBien, servicioId: f.servicio_id }));
  },

  /**
   * Alta masiva desde PL-03. Una sola sentencia preparada reutilizada: con 20.000
   * filas, recompilar el INSERT por cada bien es el grueso del tiempo. La llamada
   * ya viene dentro de la transacción del middleware IPC, así que no abre otra.
   */
  insertar(db: ConexionSqlite, b: BienDelBarrido & { id: string; procesoId: string; barridoId: string | null; ahora: string }): void {
    preparado(db, INSERT_BIEN).run(b);
  },

  actualizarDesdeBarrido(db: ConexionSqlite, b: BienDelBarrido & { id: string; barridoId: string; ahora: string }): void {
    preparado(db, ACTUALIZAR_BIEN).run(b);
    preparado(db, ACTUALIZAR_TEXTO_BIEN).run({ id: b.id, descripcionFuncional: b.descripcionFuncional, marca: b.marca, modelo: b.modelo, serie: b.serie });
  },

  /** Los que un barrido no encontró en los servicios que sí recorrió. */
  marcarNoEncontrados(db: ConexionSqlite, ids: readonly string[], ahora: string): number {
    const s = preparado(db, `UPDATE bien SET estado_registro = 'NO_ENCONTRADO', actualizado_en = ? WHERE id = ? AND estado_registro = 'ACTIVO'`);
    let n = 0;
    for (const id of ids) n += s.run(ahora, id).changes;
    return n;
  },

  cambiarEstado(db: ConexionSqlite, id: string, estado: EstadoBien, ahora: string): void {
    db.prepare('UPDATE bien SET estado_registro = ?, actualizado_en = ? WHERE id = ?').run(estado, ahora, id);
  },

  marcarObsolescenciaFuncional(db: ConexionSqlite, id: string, funcional: boolean, justificacion: string, ahora: string): number {
    return db
      .prepare('UPDATE bien SET obsolescencia_funcional = ?, justificacion_funcional = ?, actualizado_en = ? WHERE id = ?')
      .run(funcional ? 1 : 0, funcional ? justificacion : null, ahora, id).changes;
  },

  listar(db: ConexionSqlite, procesoId: string, filtros: FiltrosBien, orden: OrdenBien, pagina: number, tamano: number): Pagina<BienListadoDto> {
    const { sql, params } = construirFiltro(procesoId, filtros);
    const columna = COLUMNAS_ORDEN[orden.columna] ?? COLUMNAS_ORDEN['codigoInstitucional'];
    const direccion = orden.ascendente ? 'ASC' : 'DESC';

    // El conteo solo une con hoja_vida si el filtro la necesita: sobre 20.000 filas,
    // evitar un JOIN inútil por cada página pedida se nota.
    const unionHoja = filtros.sinHojaVida === true ? 'LEFT JOIN hoja_vida h ON h.bien_id = b.id' : '';
    const total = (preparado(db, `SELECT COUNT(*) AS n FROM bien b ${unionHoja} WHERE ${sql}`).get(...params) as { n: number }).n;

    const filas = preparado(db, `${SELECT_BASE} WHERE ${sql} ORDER BY ${columna} ${direccion}, b.codigo_institucional ASC LIMIT ? OFFSET ?`).all(
      ...params,
      tamano,
      pagina * tamano,
    ) as FilaListado[];

    return { filas: filas.map(aListadoDto), total, pagina, tamano };
  },

  /** Ids de TODO lo que cumple el filtro: "seleccionar todo" no es solo la página visible. */
  idsDelFiltro(db: ConexionSqlite, procesoId: string, filtros: FiltrosBien, maximo = 50_000): string[] {
    const { sql, params } = construirFiltro(procesoId, filtros);
    return (preparado(db, `SELECT b.id FROM bien b LEFT JOIN hoja_vida h ON h.bien_id = b.id WHERE ${sql} LIMIT ?`).all(...params, maximo) as { id: string }[]).map((f) => f.id);
  },

  porId(db: ConexionSqlite, id: string): BienDto | null {
    const f = db
      .prepare(
        `${SELECT_BASE.replace('SELECT b.id,', 'SELECT b.id, b.proceso_id, b.clase_activo_id, b.sede_id, b.servicio_id, s.nombre AS sede_nombre, b.fecha_toma, b.funcionario_conteo, b.observaciones, b.justificacion_funcional, b.creado_en, b.actualizado_en,')} WHERE b.id = ?`,
      )
      .get(id) as
      | (FilaListado & {
          proceso_id: string;
          clase_activo_id: string;
          sede_id: string;
          servicio_id: string;
          sede_nombre: string;
          fecha_toma: string;
          funcionario_conteo: string;
          observaciones: string | null;
          justificacion_funcional: string | null;
          creado_en: string;
          actualizado_en: string;
        })
      | undefined;
    if (f === undefined) return null;
    return {
      ...aListadoDto(f),
      procesoId: f.proceso_id as Uuid,
      claseActivoId: f.clase_activo_id as Uuid,
      sedeId: f.sede_id as Uuid,
      servicioId: f.servicio_id as Uuid,
      sedeNombre: f.sede_nombre,
      fechaToma: f.fecha_toma as FechaIso,
      funcionarioConteo: f.funcionario_conteo,
      observaciones: f.observaciones,
      justificacionFuncional: f.justificacion_funcional,
      creadoEn: f.creado_en as MarcaTiempo,
      actualizadoEn: f.actualizado_en as MarcaTiempo,
    };
  },

  /** Cuántos bienes hay en cada servicio y cuándo se contaron por última vez. */
  cobertura(db: ConexionSqlite, procesoId: string): Cobertura {
    const filas = db
      .prepare(
        `SELECT s.id AS sede_id, s.codigo AS sede_codigo, s.nombre AS sede_nombre,
                v.id AS servicio_id, v.codigo AS servicio_codigo, v.nombre AS servicio_nombre,
                COUNT(b.id) FILTER (WHERE b.estado_registro <> 'DADO_DE_BAJA') AS bienes,
                COUNT(b.id) FILTER (WHERE b.estado_registro = 'NO_ENCONTRADO') AS no_encontrados,
                MAX(b.fecha_toma) AS ultima_toma
         FROM servicio v
           JOIN sede s ON s.id = v.sede_id
           LEFT JOIN bien b ON b.servicio_id = v.id AND b.proceso_id = s.proceso_id
         WHERE s.proceso_id = ? AND v.activo = 1 AND s.activa = 1
         GROUP BY v.id
         ORDER BY s.codigo, v.codigo`,
      )
      .all(procesoId) as {
      sede_id: string;
      sede_codigo: string;
      sede_nombre: string;
      servicio_id: string;
      servicio_codigo: string;
      servicio_nombre: string;
      bienes: number;
      no_encontrados: number;
      ultima_toma: string | null;
    }[];

    const servicios: CoberturaServicio[] = filas.map((f) => ({
      sedeId: f.sede_id as Uuid,
      sedeCodigo: f.sede_codigo,
      sedeNombre: f.sede_nombre,
      servicioId: f.servicio_id as Uuid,
      servicioCodigo: f.servicio_codigo,
      servicioNombre: f.servicio_nombre,
      bienes: f.bienes,
      noEncontrados: f.no_encontrados,
      ultimaToma: f.ultima_toma === null ? null : (f.ultima_toma as FechaIso),
    }));
    return {
      servicios,
      serviciosActivos: servicios.length,
      serviciosConBienes: servicios.filter((s) => s.bienes > 0).length,
      totalBienes: servicios.reduce((n, s) => n + s.bienes, 0),
    };
  },

  insertarBarrido(
    db: ConexionSqlite,
    b: { id: string; procesoId: string; fecha: string; archivo: string; archivoConservado: string; hashSha256: string; nuevos: number; actualizados: number; noEncontrados: number; servicios: number; ahora: string },
  ): void {
    db.prepare(
      `INSERT INTO barrido (id, proceso_id, fecha, archivo, archivo_conservado, hash_sha256, bienes_nuevos, bienes_actualizados, bienes_no_encontrados, servicios_recorridos, creado_en)
       VALUES (@id, @procesoId, @fecha, @archivo, @archivoConservado, @hashSha256, @nuevos, @actualizados, @noEncontrados, @servicios, @ahora)`,
    ).run(b);
  },

  barridos(db: ConexionSqlite, procesoId: string): BarridoDto[] {
    return (
      db
        .prepare(
          `SELECT id, proceso_id, fecha, archivo, bienes_nuevos, bienes_actualizados, bienes_no_encontrados, servicios_recorridos, creado_en
             FROM barrido WHERE proceso_id = ? ORDER BY creado_en DESC, fecha DESC`,
        )
        .all(procesoId) as FilaBarrido[]
    ).map(aBarridoDto);
  },
};
