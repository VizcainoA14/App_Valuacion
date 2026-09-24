/**
 * RF-02-07 — Un **barrido**: la importación de `PL-03` con reporte fila por fila,
 * la ÚNICA vía de entrada del inventario (ADR-015: la app no se usa en campo).
 *
 * ADR-028: el inventario es de la entidad y vive entre valuaciones. Un barrido
 * no lo reemplaza, lo actualiza:
 *   - el bien que no existía se crea;
 *   - el que ya existía (mismo código institucional) toma lo que el barrido vio:
 *     dónde está, en qué estado, quién lo contó; si estaba NO_ENCONTRADO, reaparece;
 *   - el que estaba registrado en un servicio que este barrido SÍ recorrió y no
 *     aparece en el archivo pasa a NO_ENCONTRADO. Los servicios que el archivo no
 *     menciona no se tocan: un barrido parcial es legítimo.
 *
 * Reglas que aplica, además de la normalización genérica de TR-02:
 *   RN-02-01  código institucional y placa únicos dentro de la entidad
 *   RN-02-05  serie repetida es ADVERTENCIA, nunca bloquea
 *   VAL-02-03 clase, sede y servicio deben existir en el catálogo de la entidad
 *   VAL-02-04 estado actual y condición de tenencia son obligatorios (por catálogo)
 */
import type { ContextoIpc } from '../../../ipc/registroIpc';
import type { IncidenciaImportacion } from '../../../../compartido/dtos/importacion';
import { ErrorValidacion } from '../../../../compartido/errores';
import { leerYNormalizar, rechazarFila, type FilaNormalizada, type LecturaNormalizada } from '../../../infraestructura/documental/excel/importador';
import type { AmbitoImportacion, ArchivoImportado, ImportadorPlantilla, ResultadoAplicacion } from '../../../infraestructura/documental/excel/orquestadorImportacion';
import { nuevoId } from '../../../infraestructura/db/identificadores';
import { bienRepo, type BienDelBarrido } from '../repositorio/bien.repo';
import { HOJA_INVENTARIO, PL_03 } from './plantillaPl03';

/**
 * Catálogo de la entidad en memoria: resolver 20.000 filas con una consulta por
 * fila serían 60.000 viajes a SQLite. Se carga una vez por importación.
 *
 * Cada catálogo se indexa DOS veces, exacto y laxo. La búsqueda prueba primero
 * el exacto, así que una coincidencia literal siempre gana y la tolerancia nunca
 * puede robarle una fila a otra clase.
 */
interface Indice {
  readonly exacto: ReadonlyMap<string, string>;
  readonly laxo: ReadonlyMap<string, string>;
  /** Los nombres tal como están en la base, para poder decirlos en el error. */
  readonly nombres: readonly string[];
}

interface CatalogoProceso {
  /** Clase por nombre Y por código: el hospital puede teclear cualquiera de los dos. */
  readonly clases: Indice;
  readonly sedes: Indice;
  /** Clave "sedeId|nombre-o-código de servicio". */
  readonly servicios: Indice;
}

function clave(v: unknown): string {
  return String(v).trim().toUpperCase().replace(/\s+/g, ' ');
}

/**
 * Clave tolerante para comparar nombres de catálogo escritos por personas:
 * ignora tildes y trata la puntuación como separador.
 *
 * No es un capricho. El catálogo sugerido de `/especificacion/teoria` §5 dice
 * «Equipo médico-científico» y el hospital escribe «EQUIPO MEDICO CIENTIFICO»
 * en mayúscula sostenida, como se llena un formato en papel. Sin esto, 23 de 41
 * bienes se rechazaban por una tilde y un guion (reportado el 2026-09-04).
 */
function claveLaxa(v: unknown): string {
  return clave(v)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^A-Z0-9|]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

interface EntradaIndice {
  readonly clave: string;
  readonly id: string;
  /** Solo las entradas "principales" (el nombre) se listan en los errores. */
  readonly nombre?: string;
}

/** Construye el índice doble; ante una colisión de clave, la primera manda. */
function indexar(entradas: readonly EntradaIndice[]): Indice {
  const exacto = new Map<string, string>();
  const laxo = new Map<string, string>();
  const nombres: string[] = [];
  for (const e of entradas) {
    const k = clave(e.clave);
    const kl = claveLaxa(e.clave);
    if (!exacto.has(k)) exacto.set(k, e.id);
    if (!laxo.has(kl)) laxo.set(kl, e.id);
    if (e.nombre !== undefined && !nombres.includes(e.nombre)) nombres.push(e.nombre);
  }
  return { exacto, laxo, nombres };
}

function buscar(indice: Indice, valor: unknown): string | undefined {
  return indice.exacto.get(clave(valor)) ?? indice.laxo.get(claveLaxa(valor));
}

/** Para el mensaje de error: qué hay realmente en el catálogo. */
function listar(nombres: readonly string[], maximo = 6): string {
  const vista = nombres.slice(0, maximo).map((n) => `«${n}»`).join(', ');
  return nombres.length > maximo ? `${vista} y ${nombres.length - maximo} más` : vista;
}

function cargarCatalogo(ctx: ContextoIpc, procesoId: string): CatalogoProceso {
  const filasClases = ctx.sqlite.prepare('SELECT id, codigo, nombre FROM clase_activo WHERE proceso_id = ? AND activo = 1 ORDER BY codigo').all(procesoId) as { id: string; codigo: string; nombre: string }[];
  const clases = indexar(filasClases.flatMap((c) => [{ clave: c.nombre, id: c.id, nombre: c.nombre }, { clave: c.codigo, id: c.id }]));

  const filasSedes = ctx.sqlite.prepare('SELECT id, codigo, nombre FROM sede WHERE proceso_id = ? AND activa = 1 ORDER BY codigo').all(procesoId) as { id: string; codigo: string; nombre: string }[];
  const sedes = indexar(filasSedes.flatMap((s) => [{ clave: s.codigo, id: s.id, nombre: `${s.codigo} — ${s.nombre}` }, { clave: s.nombre, id: s.id }]));

  const filasServicios = ctx.sqlite
    .prepare('SELECT v.id, v.codigo, v.nombre, v.sede_id FROM servicio v JOIN sede s ON s.id = v.sede_id WHERE s.proceso_id = ? AND v.activo = 1 AND s.activa = 1 ORDER BY s.codigo, v.codigo')
    .all(procesoId) as { id: string; codigo: string; nombre: string; sede_id: string }[];
  const servicios = indexar(filasServicios.flatMap((v) => [{ clave: `${v.sede_id}|${v.nombre}`, id: v.id, nombre: v.nombre }, { clave: `${v.sede_id}|${v.codigo}`, id: v.id }]));

  return { clases, sedes, servicios };
}

/** Lo que una fila válida aporta, ya resuelto contra el catálogo. */
interface BienResuelto {
  readonly claseActivoId: string;
  readonly sedeId: string;
  readonly servicioId: string;
}

const resueltos = new WeakMap<FilaNormalizada, BienResuelto>();

function error(fila: number, columna: string, valor: unknown, motivo: string): IncidenciaImportacion {
  return { hoja: HOJA_INVENTARIO, fila, columna, valorRecibido: valor === null || valor === undefined ? null : String(valor), motivo, severidad: 'ERROR' };
}

function aviso(fila: number, columna: string | null, valor: unknown, motivo: string): IncidenciaImportacion {
  return { hoja: HOJA_INVENTARIO, fila, columna, valorRecibido: valor === null || valor === undefined ? null : String(valor), motivo, severidad: 'ADVERTENCIA' };
}

const texto = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));

function aBien(f: FilaNormalizada, r: BienResuelto): BienDelBarrido {
  const d = f.datos;
  return {
    codigoInstitucional: String(d['codigo_institucional']).trim(),
    placa: String(d['placa']).trim(),
    descripcionFuncional: String(d['descripcion_funcional']),
    claseActivoId: r.claseActivoId,
    marca: texto(d['marca']),
    modelo: texto(d['modelo']),
    serie: texto(d['serie']),
    sedeId: r.sedeId,
    servicioId: r.servicioId,
    cantidad: typeof d['cantidad'] === 'number' && d['cantidad'] >= 1 ? d['cantidad'] : 1,
    estadoActual: String(d['estado_actual']),
    condicionTenencia: String(d['condicion_tenencia']),
    responsableCustodia: texto(d['responsable_custodia']),
    fechaToma: String(d['fecha_toma']),
    funcionarioConteo: String(d['funcionario_que_cuenta']),
    observaciones: texto(d['observaciones']),
  };
}

/**
 * Qué va a hacer el barrido con lo ya registrado. Se calcula igual al
 * previsualizar (para avisar) que al confirmar (para escribir), sobre la base
 * de ese momento: entre una cosa y otra puede haber pasado algo.
 */
function planDelBarrido(ctx: ContextoIpc, procesoId: string, filas: readonly FilaNormalizada[]) {
  const porCodigo = new Map(bienRepo.existentes(ctx.sqlite, procesoId).map((b) => [clave(b.codigo), b]));
  const vistos = new Set<string>();
  const recorridos = new Set<string>();
  let nuevos = 0;
  let actualizados = 0;
  for (const f of filas) {
    const r = resueltos.get(f);
    if (r === undefined) continue;
    recorridos.add(r.servicioId);
    const codigo = clave(f.datos['codigo_institucional']);
    vistos.add(codigo);
    if (porCodigo.has(codigo)) actualizados += 1;
    else nuevos += 1;
  }
  const noEncontrados = [...porCodigo.entries()]
    .filter(([codigo, b]) => b.estado === 'ACTIVO' && recorridos.has(b.servicioId) && !vistos.has(codigo))
    .map(([, b]) => b);
  return { porCodigo, nuevos, actualizados, noEncontrados, recorridos };
}

function validarNegocio(ambito: AmbitoImportacion, lectura: LecturaNormalizada, ctx: ContextoIpc): void {
  if (ambito.procesoId === null) return;
  const catalogo = cargarCatalogo(ctx, ambito.procesoId);
  const filas = lectura.hojas[HOJA_INVENTARIO] ?? [];
  const hoy = ctx.ahoraIso().slice(0, 10);

  // Lo ya registrado, de una vez: consultar bien a bien serían dos viajes a SQLite
  // por fila del archivo. Un inventario típico trae miles.
  const existentes = bienRepo.existentes(ctx.sqlite, ambito.procesoId);
  const porCodigo = new Map(existentes.map((b) => [clave(b.codigo), b]));
  const codigoDeLaPlaca = new Map(existentes.map((b) => [clave(b.placa), b.codigo]));

  // RN-02-01: la placa no la cubre `claveUnica` (esa es del código); se cuenta aparte.
  const placasArchivo = new Map<string, number>();
  const seriesArchivo = new Map<string, number>();
  let conFoto = 0;

  for (const f of [...filas]) {
    const d = f.datos;

    // El mensaje dice qué hay en el catálogo: sin eso, quien importa no puede
    // saber si le sobra una tilde o si de verdad le falta la clase.
    const claseId = buscar(catalogo.clases, d['clase_activo']);
    if (claseId === undefined) {
      const salida = catalogo.clases.nombres.length === 0
        ? 'El catálogo de clases está vacío: impórtelo con PL-02 antes.'
        : `Las clases de la entidad son: ${listar(catalogo.clases.nombres)}. Corrija el nombre en el archivo, escriba el código de la clase, o actualice el catálogo con PL-02.`;
      rechazarFila(lectura, HOJA_INVENTARIO, f.numero, error(f.numero, 'clase_activo', d['clase_activo'], `La clase no existe en el catálogo de la entidad. ${salida}`));
      continue;
    }
    const sedeId = buscar(catalogo.sedes, d['sede']);
    if (sedeId === undefined) {
      const salida = catalogo.sedes.nombres.length === 0
        ? 'No hay sedes registradas: impórtelas con PL-02b antes.'
        : `Las sedes de la entidad son: ${listar(catalogo.sedes.nombres)}. Corrija el código en el archivo o actualice el catálogo con PL-02b.`;
      rechazarFila(lectura, HOJA_INVENTARIO, f.numero, error(f.numero, 'sede', d['sede'], `La sede no existe en el catálogo de la entidad. ${salida}`));
      continue;
    }
    const servicioId = buscar(catalogo.servicios, `${sedeId}|${String(d['servicio_ubicacion'])}`);
    if (servicioId === undefined) {
      rechazarFila(lectura, HOJA_INVENTARIO, f.numero, error(f.numero, 'servicio_ubicacion', d['servicio_ubicacion'], `El servicio no existe en la sede ${String(d['sede'])}. Los servicios registrados son: ${listar(catalogo.servicios.nombres, 10)}.`));
      continue;
    }

    const placa = clave(d['placa']);
    const placaAnterior = placasArchivo.get(placa);
    if (placaAnterior !== undefined) {
      rechazarFila(lectura, HOJA_INVENTARIO, f.numero, error(f.numero, 'placa', d['placa'], `RN-02-01: la placa ya está en la fila ${placaAnterior} de este archivo`));
      continue;
    }
    const codigo = String(d['codigo_institucional']).trim();
    // Una placa registrada a nombre de OTRO código: dos bienes no comparten placa.
    const duenoPlaca = codigoDeLaPlaca.get(placa);
    if (duenoPlaca !== undefined && clave(duenoPlaca) !== clave(codigo)) {
      rechazarFila(lectura, HOJA_INVENTARIO, f.numero, error(f.numero, 'placa', d['placa'], `RN-02-01: esa placa ya pertenece al bien ${duenoPlaca}`));
      continue;
    }
    placasArchivo.set(placa, f.numero);

    const registrado = porCodigo.get(clave(codigo));
    if (registrado?.estado === 'DADO_DE_BAJA') {
      lectura.incidencias.push(aviso(f.numero, 'codigo_institucional', codigo, 'El bien figura dado de baja. Se actualizan sus datos pero sigue dado de baja; si continúa en uso, anule la baja.'));
    }

    // RN-02-05: series repetidas son normales en equipos idénticos. Advertir, no bloquear.
    const serie = d['serie'] === null || d['serie'] === undefined ? '' : clave(d['serie']);
    if (serie !== '') {
      const anterior = seriesArchivo.get(serie);
      if (anterior === undefined) seriesArchivo.set(serie, f.numero);
      else lectura.incidencias.push(aviso(f.numero, 'serie', d['serie'], `La misma serie está en la fila ${anterior}; se importa igual (RN-02-05)`));
    }

    if (typeof d['fecha_toma'] === 'string' && d['fecha_toma'] > hoy) {
      lectura.incidencias.push(aviso(f.numero, 'fecha_toma', d['fecha_toma'], 'La fecha de la toma es futura; se importa igual'));
    }
    if (d['tiene_foto'] === true) conFoto += 1;

    resueltos.set(f, { claseActivoId: claseId, sedeId, servicioId });
  }

  const plan = planDelBarrido(ctx, ambito.procesoId, filas);
  if (plan.noEncontrados.length > 0) {
    const muestra = plan.noEncontrados.slice(0, 8).map((b) => b.codigo).join(', ');
    lectura.incidencias.push(
      aviso(
        0,
        null,
        String(plan.noEncontrados.length),
        `${plan.noEncontrados.length} bienes registrados en los servicios que recorre este archivo no aparecen en él y quedarán como NO ENCONTRADOS: ${muestra}${plan.noEncontrados.length > 8 ? '…' : ''}. Los servicios que el archivo no menciona no se tocan.`,
      ),
    );
  }

  if (conFoto > 0) {
    lectura.incidencias.push(aviso(0, 'tiene_foto', conFoto, `${conFoto} filas declaran tener fotografía. La aplicación no guarda imágenes; la columna solo se deja como recordatorio.`));
  }
}

function aplicar(ambito: AmbitoImportacion, lectura: LecturaNormalizada, ctx: ContextoIpc, archivo: ArchivoImportado): ResultadoAplicacion {
  const procesoId = ambito.procesoId;
  if (procesoId === null) throw new ErrorValidacion('PROCESO_REQUERIDO', 'PL-03 se importa dentro de un proceso.', { campo: 'procesoId' });
  const ahora = ctx.ahoraIso();
  const filas = (lectura.hojas[HOJA_INVENTARIO] ?? []).filter((f) => resueltos.has(f));
  const plan = planDelBarrido(ctx, procesoId, filas);

  // El barrido se registra ANTES que los bienes, con sus cifras ya calculadas:
  // es inmutable, y cada bien que toca apunta a él.
  const barridoId = nuevoId();
  const fecha = filas.reduce((max, f) => {
    const t = f.datos['fecha_toma'];
    return typeof t === 'string' && t > max ? t : max;
  }, '');
  bienRepo.insertarBarrido(ctx.sqlite, {
    id: barridoId,
    procesoId,
    fecha: fecha === '' ? ahora.slice(0, 10) : fecha,
    archivo: archivo.nombre,
    archivoConservado: archivo.conservado,
    hashSha256: archivo.hashSha256,
    nuevos: plan.nuevos,
    actualizados: plan.actualizados,
    noEncontrados: plan.noEncontrados.length,
    servicios: plan.recorridos.size,
    ahora,
  });

  for (const f of filas) {
    const r = resueltos.get(f);
    if (r === undefined) continue;
    const bien = aBien(f, r);
    const existente = plan.porCodigo.get(clave(bien.codigoInstitucional));
    if (existente === undefined) bienRepo.insertar(ctx.sqlite, { ...bien, id: nuevoId(), procesoId, barridoId, ahora });
    else bienRepo.actualizarDesdeBarrido(ctx.sqlite, { ...bien, id: existente.id, barridoId, ahora });
  }
  bienRepo.marcarNoEncontrados(ctx.sqlite, plan.noEncontrados.map((b) => b.id), ahora);

  return { creados: plan.nuevos, actualizados: plan.actualizados };
}

export const IMPORTADOR_PL_03: ImportadorPlantilla = {
  codigo: 'PL-03',
  leer: (archivo, formatoFecha) => leerYNormalizar(archivo, PL_03, formatoFecha),
  validarNegocio,
  aplicar,
};
