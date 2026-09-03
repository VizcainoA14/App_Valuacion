/**
 * Listado de bienes con filtro, orden y paginación EN EL MAIN (TR-10, ADR-010):
 * traer 20.000 filas al renderer para filtrar 40 es inaceptable (RNF-01, RG-12).
 * SQL a mano por ser la consulta crítica del sistema (ADR-005 regla 1).
 */
import type { Statement } from 'better-sqlite3';
import type { ConexionSqlite } from '../../../infraestructura/db/conexion';
import type { BienDto, BienListadoDto, Cobertura, CoberturaServicio, FiltrosBien, OrdenBien, Pagina } from '../../../../compartido/dtos/inventario';
import type { Uuid, FechaIso, Centavos, MarcaTiempo } from '../../../../compartido/tipos/basicos';
import type { EstadoActual, CondicionTenencia, EstadoRegistro } from '../../../../compartido/enums/catalogos';

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
         k.codigo AS clase_codigo, k.nombre AS clase_nombre,
         s.codigo AS sede_codigo, v.codigo AS servicio_codigo, v.nombre AS servicio_nombre,
         h.costo_adquisicion_cent, h.fecha_adquisicion, (h.id IS NOT NULL) AS tiene_hoja_vida,
         (SELECT COUNT(*) FROM foto_bien f WHERE f.bien_id = b.id) AS numero_fotos
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
  clase_codigo: string;
  clase_nombre: string;
  sede_codigo: string;
  servicio_codigo: string;
  servicio_nombre: string;
  costo_adquisicion_cent: number | null;
  fecha_adquisicion: string | null;
  tiene_hoja_vida: number;
  numero_fotos: number;
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
    estadoRegistro: f.estado_registro as EstadoRegistro,
    costoAdquisicion: f.costo_adquisicion_cent === null ? null : (f.costo_adquisicion_cent as Centavos),
    fechaAdquisicion: f.fecha_adquisicion === null ? null : (f.fecha_adquisicion as FechaIso),
    tieneHojaVida: f.tiene_hoja_vida === 1,
    numeroFotos: f.numero_fotos,
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
function construirFiltro(ejercicioId: string, filtros: FiltrosBien): { sql: string; params: unknown[] } {
  const condiciones = ['b.ejercicio_id = ?'];
  const params: unknown[] = [ejercicioId];

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

/** Un bien listo para escribir, con los catálogos ya resueltos a identificadores. */
export interface BienParaInsertar {
  readonly id: string;
  readonly ejercicioId: string;
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
  readonly creadoEn: string;
  readonly actualizadoEn: string;
}

// `estado_registro` no se parametriza: un trigger de ANEXO_B §6.2 obliga a que
// TODO bien nazca en BORRADOR. El paso a INCOMPLETO es una transición aparte.
const INSERT_BIEN = `
  INSERT INTO bien (id, ejercicio_id, codigo_institucional, placa, descripcion_funcional, clase_activo_id,
                    marca, modelo, serie, sede_id, servicio_id, cantidad, estado_actual, condicion_tenencia,
                    responsable_custodia, fecha_toma, funcionario_conteo, observaciones, estado_registro,
                    creado_en, actualizado_en)
  VALUES (@id, @ejercicioId, @codigoInstitucional, @placa, @descripcionFuncional, @claseActivoId,
          @marca, @modelo, @serie, @sedeId, @servicioId, @cantidad, @estadoActual, @condicionTenencia,
          @responsableCustodia, @fechaToma, @funcionarioConteo, @observaciones, 'BORRADOR',
          @creadoEn, @actualizadoEn)`;

export const bienRepo = {
  /**
   * Alta masiva desde PL-03. Una sola sentencia preparada reutilizada: con 20.000
   * filas, recompilar el INSERT por cada bien es el grueso del tiempo. La llamada
   * ya viene dentro de la transacción del middleware IPC, así que no abre otra.
   */
  insertarLote(db: ConexionSqlite, bienes: readonly BienParaInsertar[]): number {
    if (bienes.length === 0) return 0;
    const sentencia = preparado(db, INSERT_BIEN);
    for (const b of bienes) sentencia.run(b);
    return bienes.length;
  },

  /**
   * RN-03-01 — recién importado, ningún bien tiene fecha ni costo (eso lo trae
   * PL-05), así que pasa de BORRADOR a INCOMPLETO. Es una transición válida de
   * la máquina de ANEXO_B §6.2, no un estado inicial.
   */
  marcarIncompletos(db: ConexionSqlite, ids: readonly string[], actualizadoEn: string): number {
    if (ids.length === 0) return 0;
    const sentencia = preparado(db, `UPDATE bien SET estado_registro = 'INCOMPLETO', actualizado_en = ? WHERE id = ? AND estado_registro = 'BORRADOR'`);
    let n = 0;
    for (const id of ids) n += sentencia.run(actualizadoEn, id).changes;
    return n;
  },

  listar(db: ConexionSqlite, ejercicioId: string, filtros: FiltrosBien, orden: OrdenBien, pagina: number, tamano: number): Pagina<BienListadoDto> {
    const { sql, params } = construirFiltro(ejercicioId, filtros);
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
  idsDelFiltro(db: ConexionSqlite, ejercicioId: string, filtros: FiltrosBien, maximo = 50_000): string[] {
    const { sql, params } = construirFiltro(ejercicioId, filtros);
    return (preparado(db, `SELECT b.id FROM bien b LEFT JOIN hoja_vida h ON h.bien_id = b.id WHERE ${sql} LIMIT ?`).all(...params, maximo) as { id: string }[]).map((f) => f.id);
  },

  porId(db: ConexionSqlite, id: string): BienDto | null {
    const f = db
      .prepare(
        `${SELECT_BASE.replace('SELECT b.id,', 'SELECT b.id, b.ejercicio_id, b.clase_activo_id, b.sede_id, b.servicio_id, s.nombre AS sede_nombre, b.fecha_toma, b.funcionario_conteo, b.observaciones, b.creado_en, b.actualizado_en,')} WHERE b.id = ?`,
      )
      .get(id) as (FilaListado & { ejercicio_id: string; clase_activo_id: string; sede_id: string; servicio_id: string; sede_nombre: string; fecha_toma: string; funcionario_conteo: string; observaciones: string | null; creado_en: string; actualizado_en: string }) | undefined;
    if (f === undefined) return null;
    return {
      ...aListadoDto(f),
      ejercicioId: f.ejercicio_id as Uuid,
      claseActivoId: f.clase_activo_id as Uuid,
      sedeId: f.sede_id as Uuid,
      servicioId: f.servicio_id as Uuid,
      sedeNombre: f.sede_nombre,
      fechaToma: f.fecha_toma as FechaIso,
      funcionarioConteo: f.funcionario_conteo,
      observaciones: f.observaciones,
      creadoEn: f.creado_en as MarcaTiempo,
      actualizadoEn: f.actualizado_en as MarcaTiempo,
    };
  },

  porCodigo(db: ConexionSqlite, ejercicioId: string, codigo: string): { id: string } | null {
    return (db.prepare('SELECT id FROM bien WHERE ejercicio_id = ? AND codigo_institucional = ?').get(ejercicioId, codigo) as { id: string } | undefined) ?? null;
  },

  porPlaca(db: ConexionSqlite, ejercicioId: string, placa: string): { id: string } | null {
    return (db.prepare('SELECT id FROM bien WHERE ejercicio_id = ? AND placa = ?').get(ejercicioId, placa) as { id: string } | undefined) ?? null;
  },

  /** RF-02-08 — tablero de cobertura por sede y servicio. */
  cobertura(db: ConexionSqlite, entidadId: string, ejercicioId: string): Cobertura {
    const filas = db
      .prepare(
        `SELECT s.id AS sede_id, s.codigo AS sede_codigo, s.nombre AS sede_nombre,
                v.id AS servicio_id, v.codigo AS servicio_codigo, v.nombre AS servicio_nombre,
                (SELECT COUNT(*) FROM bien b WHERE b.ejercicio_id = ? AND b.servicio_id = v.id) AS bienes,
                EXISTS (SELECT 1 FROM acta_custodia a WHERE a.ejercicio_id = ? AND a.servicio_id = v.id) AS con_acta
         FROM servicio v JOIN sede s ON s.id = v.sede_id
         WHERE s.entidad_id = ? AND v.activo = 1 AND s.activa = 1
         ORDER BY s.codigo, v.codigo`,
      )
      .all(ejercicioId, ejercicioId, entidadId) as { sede_id: string; sede_codigo: string; sede_nombre: string; servicio_id: string; servicio_codigo: string; servicio_nombre: string; bienes: number; con_acta: number }[];

    const servicios: CoberturaServicio[] = filas.map((f) => ({
      sedeId: f.sede_id as Uuid,
      sedeCodigo: f.sede_codigo,
      sedeNombre: f.sede_nombre,
      servicioId: f.servicio_id as Uuid,
      servicioCodigo: f.servicio_codigo,
      servicioNombre: f.servicio_nombre,
      bienes: f.bienes,
      conActa: f.con_acta === 1,
      recorrido: f.bienes > 0 || f.con_acta === 1,
    }));
    return {
      servicios,
      serviciosActivos: servicios.length,
      serviciosRecorridos: servicios.filter((s) => s.recorrido).length,
      totalBienes: servicios.reduce((n, s) => n + s.bienes, 0),
    };
  },
};
