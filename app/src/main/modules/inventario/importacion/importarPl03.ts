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
 */
interface CatalogoEntidad {
  /** Clase por nombre Y por código: el hospital puede teclear cualquiera de los dos. */
  readonly clases: ReadonlyMap<string, string>;
  readonly sedes: ReadonlyMap<string, string>;
  /** Clave "sedeId|nombre-o-código de servicio". */
  readonly servicios: ReadonlyMap<string, string>;
}

function clave(v: unknown): string {
  return String(v).trim().toUpperCase().replace(/\s+/g, ' ');
}

function cargarCatalogo(ctx: ContextoIpc, entidadId: string): CatalogoEntidad {
  const clases = new Map<string, string>();
  for (const c of ctx.sqlite.prepare('SELECT id, codigo, nombre FROM clase_activo WHERE entidad_id = ? AND activo = 1').all(entidadId) as { id: string; codigo: string; nombre: string }[]) {
    clases.set(clave(c.nombre), c.id);
    if (!clases.has(clave(c.codigo))) clases.set(clave(c.codigo), c.id);
  }
  const sedes = new Map<string, string>();
  for (const s of ctx.sqlite.prepare('SELECT id, codigo, nombre FROM sede WHERE entidad_id = ? AND activa = 1').all(entidadId) as { id: string; codigo: string; nombre: string }[]) {
    sedes.set(clave(s.codigo), s.id);
    if (!sedes.has(clave(s.nombre))) sedes.set(clave(s.nombre), s.id);
  }
  const servicios = new Map<string, string>();
  for (const v of ctx.sqlite
    .prepare('SELECT v.id, v.codigo, v.nombre, v.sede_id FROM servicio v JOIN sede s ON s.id = v.sede_id WHERE s.entidad_id = ? AND v.activo = 1 AND s.activa = 1')
    .all(entidadId) as { id: string; codigo: string; nombre: string; sede_id: string }[]) {
    servicios.set(`${v.sede_id}|${clave(v.nombre)}`, v.id);
    const porCodigo = `${v.sede_id}|${clave(v.codigo)}`;
    if (!servicios.has(porCodigo)) servicios.set(porCodigo, v.id);
  }
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
  if (ejercicioId === null) return;
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

    const claseId = catalogo.clases.get(clave(d['clase_activo']));
    if (claseId === undefined) {
      rechazarFila(lectura, HOJA_INVENTARIO, f.numero, error(f.numero, 'clase_activo', d['clase_activo'], 'La clase no existe en el catálogo de la entidad (impórtela con PL-02 antes)'));
      continue;
    }
    const sedeId = catalogo.sedes.get(clave(d['sede']));
    if (sedeId === undefined) {
      rechazarFila(lectura, HOJA_INVENTARIO, f.numero, error(f.numero, 'sede', d['sede'], 'La sede no existe en el catálogo de la entidad (impórtela con PL-02b antes)'));
      continue;
    }
    const servicioId = catalogo.servicios.get(`${sedeId}|${clave(d['servicio_ubicacion'])}`);
    if (servicioId === undefined) {
      rechazarFila(lectura, HOJA_INVENTARIO, f.numero, error(f.numero, 'servicio_ubicacion', d['servicio_ubicacion'], `El servicio no existe en la sede ${String(d['sede'])}`));
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
