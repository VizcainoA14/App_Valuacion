/**
 * RF-02-07 — Importación masiva desde `PL-03` con reporte fila por fila, la ÚNICA vía de entrada del inventario
 * (ADR-015: la app no se usa en campo). Es la tarea crítica de la etapa 3 de
 * ADR-026: sin bienes en la base, el motor de cálculo no tiene sobre qué operar.
 *
 * Reglas que aplica, además de la normalización genérica de TR-02:
 *   RN-02-01  código institucional y placa únicos dentro del ejercicio
 *   RN-02-05  serie repetida es ADVERTENCIA, nunca bloquea
 *   VAL-02-03 clase, sede y servicio deben existir en el catálogo de la entidad
 *   VAL-02-04 estado actual y condición de tenencia son obligatorios (por catálogo)
 */
import type { ContextoIpc } from '../../../ipc/registroIpc';
import type { IncidenciaImportacion } from '../../../../compartido/dtos/importacion';
import { ErrorValidacion } from '../../../../compartido/errores';
import { leerYNormalizar, rechazarFila, type FilaNormalizada, type LecturaNormalizada } from '../../../infraestructura/documental/excel/importador';
import type { AmbitoImportacion, ImportadorPlantilla, ResultadoAplicacion } from '../../../infraestructura/documental/excel/orquestadorImportacion';
import { nuevoId } from '../../../infraestructura/db/identificadores';
import { bienRepo } from '../repositorio/bien.repo';
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

interface CatalogoEntidad {
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

function cargarCatalogo(ctx: ContextoIpc, entidadId: string): CatalogoEntidad {
  const filasClases = ctx.sqlite.prepare('SELECT id, codigo, nombre FROM clase_activo WHERE entidad_id = ? AND activo = 1 ORDER BY codigo').all(entidadId) as { id: string; codigo: string; nombre: string }[];
  const clases = indexar(filasClases.flatMap((c) => [{ clave: c.nombre, id: c.id, nombre: c.nombre }, { clave: c.codigo, id: c.id }]));

  const filasSedes = ctx.sqlite.prepare('SELECT id, codigo, nombre FROM sede WHERE entidad_id = ? AND activa = 1 ORDER BY codigo').all(entidadId) as { id: string; codigo: string; nombre: string }[];
  const sedes = indexar(filasSedes.flatMap((s) => [{ clave: s.codigo, id: s.id, nombre: `${s.codigo} — ${s.nombre}` }, { clave: s.nombre, id: s.id }]));

  const filasServicios = ctx.sqlite
    .prepare('SELECT v.id, v.codigo, v.nombre, v.sede_id FROM servicio v JOIN sede s ON s.id = v.sede_id WHERE s.entidad_id = ? AND v.activo = 1 AND s.activa = 1 ORDER BY s.codigo, v.codigo')
    .all(entidadId) as { id: string; codigo: string; nombre: string; sede_id: string }[];
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

function validarNegocio(ambito: AmbitoImportacion, lectura: LecturaNormalizada, ctx: ContextoIpc): void {
  const ejercicioId = ambito.ejercicioId;
  // Sin ejercicio no hay nada que validar; y donde hay ejercicio hay entidad,
  // porque el orquestador comprueba que uno pertenezca a la otra.
  if (ejercicioId === null || ambito.entidadId === null) return;
  const catalogo = cargarCatalogo(ctx, ambito.entidadId);
  const filas = lectura.hojas[HOJA_INVENTARIO] ?? [];

  const fechaCorte = (ctx.sqlite.prepare('SELECT fecha_corte FROM ejercicio WHERE id = ?').get(ejercicioId) as { fecha_corte: string } | undefined)?.fecha_corte ?? null;

  // Lo ya registrado, de una vez: consultar bien a bien serían dos viajes a SQLite
  // por fila del archivo. Un inventario típico trae miles.
  const codigosBase = new Set<string>();
  const placasBase = new Set<string>();
  for (const b of ctx.sqlite.prepare('SELECT codigo_institucional, placa FROM bien WHERE ejercicio_id = ?').all(ejercicioId) as { codigo_institucional: string; placa: string }[]) {
    codigosBase.add(clave(b.codigo_institucional));
    placasBase.add(clave(b.placa));
  }

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
    if (codigosBase.has(clave(codigo))) {
      rechazarFila(lectura, HOJA_INVENTARIO, f.numero, error(f.numero, 'codigo_institucional', codigo, 'RN-02-01: ya existe un bien con este código en el ejercicio'));
      continue;
    }
    if (placasBase.has(placa)) {
      rechazarFila(lectura, HOJA_INVENTARIO, f.numero, error(f.numero, 'placa', d['placa'], 'RN-02-01: ya existe un bien con esta placa en el ejercicio'));
      continue;
    }
    placasArchivo.set(placa, f.numero);

    // RN-02-05: series repetidas son normales en equipos idénticos. Advertir, no bloquear.
    const serie = d['serie'] === null || d['serie'] === undefined ? '' : clave(d['serie']);
    if (serie !== '') {
      const anterior = seriesArchivo.get(serie);
      if (anterior === undefined) seriesArchivo.set(serie, f.numero);
      else {
        lectura.incidencias.push({ hoja: HOJA_INVENTARIO, fila: f.numero, columna: 'serie', valorRecibido: String(d['serie']), motivo: `VAL-02-07: la misma serie está en la fila ${anterior}; se importa igual (RN-02-05)`, severidad: 'ADVERTENCIA' });
      }
    }

    if (fechaCorte !== null && typeof d['fecha_toma'] === 'string' && d['fecha_toma'] > fechaCorte) {
      lectura.incidencias.push({ hoja: HOJA_INVENTARIO, fila: f.numero, columna: 'fecha_toma', valorRecibido: d['fecha_toma'], motivo: `La toma es posterior a la fecha de corte del ejercicio (${fechaCorte}); se importa igual`, severidad: 'ADVERTENCIA' });
    }
    if (d['tiene_foto'] === true) conFoto += 1;

    resueltos.set(f, { claseActivoId: claseId, sedeId, servicioId });
  }

  if (conFoto > 0) {
    lectura.incidencias.push({
      hoja: HOJA_INVENTARIO,
      fila: 0,
      columna: 'tiene_foto',
      valorRecibido: String(conFoto),
      motivo: `${conFoto} filas declaran tener fotografía. Las imágenes se adjuntan desde la aplicación, no desde la plantilla; la columna solo se deja como recordatorio.`,
      severidad: 'ADVERTENCIA',
    });
  }
}

function aplicar(ambito: AmbitoImportacion, lectura: LecturaNormalizada, ctx: ContextoIpc): ResultadoAplicacion {
  const ejercicioId = ambito.ejercicioId;
  if (ejercicioId === null) throw new ErrorValidacion('EJERCICIO_REQUERIDO', 'PL-03 se importa dentro de un ejercicio.', { campo: 'ejercicioId' });
  const ahora = ctx.ahoraIso();
  const filas = lectura.hojas[HOJA_INVENTARIO] ?? [];

  const nuevos = filas.flatMap((f) => {
    const r = resueltos.get(f);
    // Sin resolver = la fila se rechazó en validarNegocio y ya no debería estar aquí.
    if (r === undefined) return [];
    const d = f.datos;
    return [{
      id: nuevoId(),
      ejercicioId,
      codigoInstitucional: String(d['codigo_institucional']).trim(),
      placa: String(d['placa']).trim(),
      descripcionFuncional: String(d['descripcion_funcional']),
      claseActivoId: r.claseActivoId,
      marca: d['marca'] === null || d['marca'] === undefined ? null : String(d['marca']),
      modelo: d['modelo'] === null || d['modelo'] === undefined ? null : String(d['modelo']),
      serie: d['serie'] === null || d['serie'] === undefined ? null : String(d['serie']),
      sedeId: r.sedeId,
      servicioId: r.servicioId,
      cantidad: typeof d['cantidad'] === 'number' && d['cantidad'] >= 1 ? d['cantidad'] : 1,
      estadoActual: String(d['estado_actual']),
      condicionTenencia: String(d['condicion_tenencia']),
      responsableCustodia: d['responsable_custodia'] === null || d['responsable_custodia'] === undefined ? null : String(d['responsable_custodia']),
      fechaToma: String(d['fecha_toma']),
      funcionarioConteo: String(d['funcionario_que_cuenta']),
      observaciones: d['observaciones'] === null || d['observaciones'] === undefined ? null : String(d['observaciones']),
      creadoEn: ahora,
      actualizadoEn: ahora,
    }];
  });

  bienRepo.insertarLote(ctx.sqlite, nuevos);
  // RN-03-01: recién importados no tienen fecha ni costo (los trae PL-05), así
  // que quedan INCOMPLETOS y fuera del cálculo hasta que se resuelva.
  bienRepo.marcarIncompletos(ctx.sqlite, nuevos.map((b) => b.id), ahora);
  return { creados: nuevos.length, actualizados: 0 };
}

export const IMPORTADOR_PL_03: ImportadorPlantilla = {
  codigo: 'PL-03',
  requiereEjercicio: true,
  leer: (archivo, formatoFecha) => leerYNormalizar(archivo, PL_03, formatoFecha),
  validarNegocio,
  aplicar,
};
